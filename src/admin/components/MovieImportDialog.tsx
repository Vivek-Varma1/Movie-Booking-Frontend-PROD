import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Check, CircleAlert, CircleX, FileUp, HelpCircle, LoaderCircle, X } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { FormDialog } from "./FormDialog";
import { FieldError } from "./FieldError";
import { StatusBadge } from "./StatusBadge";
import { useAdminMoviesQuery } from "../lib/queries";
import { adminKeys } from "../lib/queryKeys";
import { getApiErrorMessage } from "../lib/api-error";
import { moviesApi } from "../services/movies";
import {
  certificateOptions,
  genreOptions,
  languageOptions,
  movieStatusOptions,
} from "../types/enums";

type ImportRow = {
  id: number;
  payload: Record<string, unknown>;
  poster: File | null;
  ignored: string[];
  errors: Record<string, string>;
  invalidMessage?: string;
  result?: "pending" | "success" | "failed";
  serverMessage?: string;
};
type Step = 1 | 2 | 3;
const allowedKeys = [
  "movieName",
  "durationInMinutes",
  "language",
  "genres",
  "certificate",
  "movieStatus",
  "releaseDate",
  "trailerUrl",
  "synopsis",
];
const values = (options: readonly { value: string }[]) => options.map((option) => option.value);
const requiredEnumMessage = (name: string, options: readonly { value: string }[]) =>
  `${name} must be one of: ${values(options).join(", ")}`;
const movieSchema = z.object({
  movieName: z
    .string()
    .trim()
    .min(1, "Movie name is required")
    .max(255, "Use 255 characters or fewer"),
  durationInMinutes: z
    .number()
    .int("Duration must be a whole number")
    .min(30, "Duration must be at least 30 minutes")
    .max(500, "Duration must be 500 minutes or less"),
  language: z
    .string()
    .refine(
      (value) => languageOptions.some((option) => option.value === value),
      requiredEnumMessage("Language", languageOptions),
    ),
  genres: z
    .array(
      z
        .string()
        .refine(
          (value) => genreOptions.some((option) => option.value === value),
          requiredEnumMessage("Genre", genreOptions),
        ),
    )
    .min(1, "Choose at least one valid genre"),
  certificate: z
    .string()
    .refine(
      (value) => certificateOptions.some((option) => option.value === value),
      requiredEnumMessage("Certificate", certificateOptions),
    ),
  movieStatus: z
    .string()
    .refine(
      (value) => movieStatusOptions.some((option) => option.value === value),
      requiredEnumMessage("Movie status", movieStatusOptions),
    ),
  releaseDate: z
    .string()
    .min(1, "Release date is required")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a real YYYY-MM-DD date")
    .refine((value) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return true;
      const date = new Date(`${value}T00:00:00Z`);
      return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
    }, "Enter a real YYYY-MM-DD date"),
  trailerUrl: z
    .string()
    .max(1000, "Use 1000 characters or fewer")
    .refine((value) => !value || z.string().url().safeParse(value).success, "Enter a valid URL")
    .optional(),
  synopsis: z.string().max(2000, "Use 2000 characters or fewer").optional(),
});
const pasteSchema = z.object({ jsonText: z.string() });
const example = [
  {
    movieName: "Example Movie",
    durationInMinutes: 150,
    language: "TELUGU",
    genres: ["ACTION", "THRILLER"],
    certificate: "UA13",
    movieStatus: "NOW_SHOWING",
    releaseDate: "2026-11-20",
    trailerUrl: "https://example.com/trailer",
    synopsis: "An example synopsis.",
  },
];
const selectClass =
  "h-10 w-full min-w-28 rounded-md border border-subtle bg-surface px-2 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";
const normalizeEnum = (value: unknown) =>
  typeof value === "string" ? value.trim().toUpperCase().replace(/[ -]+/g, "_") : value;
function normalizeRecord(input: Record<string, unknown>) {
  const normalized: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(input)) {
    if (raw === null || raw === undefined || (typeof raw === "string" && !raw.trim())) continue;
    if (!allowedKeys.includes(key)) continue;
    if (key === "genres" && Array.isArray(raw))
      normalized[key] = raw
        .filter(
          (value) =>
            value !== null && value !== undefined && !(typeof value === "string" && !value.trim()),
        )
        .map(normalizeEnum);
    else if (["language", "certificate", "movieStatus"].includes(key))
      normalized[key] = normalizeEnum(raw);
    else normalized[key] = typeof raw === "string" ? raw.trim() : raw;
  }
  return normalized;
}
function validatePayload(payload: Record<string, unknown>) {
  const parsed = movieSchema.safeParse(payload);
  const errors: Record<string, string> = {};
  if (!parsed.success)
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "movie");
      errors[key] = errors[key] ?? issue.message;
    }
  return errors;
}
function payloadFromRow(row: ImportRow): Record<string, unknown> {
  const copy = { ...row.payload };
  delete copy["poster"];
  delete copy["ignoredFields"];
  return copy;
}
function rowTone(status: string): "success" | "warning" | "danger" | "info" {
  return status === "Ready"
    ? "success"
    : status === "Needs attention"
      ? "warning"
      : status === "Duplicate"
        ? "info"
        : "danger";
}
function rowStatus(row: ImportRow, duplicate: boolean) {
  if (row.invalidMessage) return "Invalid";
  if (duplicate) return "Duplicate";
  return Object.keys(row.errors).length ? "Needs attention" : "Ready";
}

export function MovieImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [step, setStep] = useState<Step>(1);
  const pasteForm = useForm<{ jsonText: string }>({
    resolver: zodResolver(pasteSchema),
    defaultValues: { jsonText: "" },
  });
  const { setValue } = pasteForm;
  const text = pasteForm.watch("jsonText");
  const setText = useCallback(
    (value: string) => setValue("jsonText", value, { shouldValidate: true }),
    [setValue],
  );
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [running, setRunning] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const rowId = useRef(0);
  const moviesQuery = useAdminMoviesQuery();
  const client = useQueryClient();
  useEffect(() => {
    if (open) return;
    setStep(1);
    setText("");
    setRows([]);
    setRunning(false);
    setActiveId(null);
  }, [open, setText]);
  const parsed = useMemo(() => {
    if (!text.trim()) return { count: 0, error: "", shapeError: false };
    try {
      const value: unknown = JSON.parse(text);
      if (Array.isArray(value))
        return {
          count: value.filter(
            (item) => item !== null && typeof item === "object" && !Array.isArray(item),
          ).length,
          error: "",
          shapeError: value.some(
            (item) => !item || typeof item !== "object" || Array.isArray(item),
          ),
        };
      if (value && typeof value === "object") return { count: 1, error: "", shapeError: false };
      return {
        count: 0,
        error: "Expected a movie object or an array of movie objects.",
        shapeError: false,
      };
    } catch (error) {
      return {
        count: 0,
        error: error instanceof Error ? error.message : "Unable to parse JSON.",
        shapeError: false,
      };
    }
  }, [text]);
  const duplicateIds = useMemo(
    () =>
      new Set(
        rows
          .filter(
            (row) =>
              !row.invalidMessage &&
              typeof row.payload["movieName"] === "string" &&
              typeof row.payload["language"] === "string" &&
              (moviesQuery.data ?? []).some(
                (movie) =>
                  movie.movieName.trim().toLocaleLowerCase() ===
                    String(row.payload["movieName"]).trim().toLocaleLowerCase() &&
                  movie.language.toLocaleLowerCase() ===
                    String(row.payload["language"]).toLocaleLowerCase(),
              ),
          )
          .map((row) => row.id),
      ),
    [rows, moviesQuery.data],
  );
  const summary = useMemo(
    () =>
      rows.reduce(
        (acc, row) => {
          const status = rowStatus(row, duplicateIds.has(row.id));
          if (status === "Ready") acc.ready++;
          else if (status === "Needs attention") acc.attention++;
          else acc.skipped++;
          return acc;
        },
        { ready: 0, attention: 0, skipped: 0 },
      ),
    [rows, duplicateIds],
  );
  const eligible = rows.filter(
    (row) => row.result !== "success" && rowStatus(row, duplicateIds.has(row.id)) === "Ready",
  );
  const changeRow = (id: number, key: string, value: unknown) =>
    setRows((current) =>
      current.map((row) => {
        if (row.id !== id) return row;
        const payload = { ...row.payload, [key]: value };
        return { ...row, payload, errors: validatePayload(payload) };
      }),
    );
  const startReview = () => {
    try {
      const raw: unknown = JSON.parse(text);
      const items = Array.isArray(raw) ? raw : [raw];
      setRows(
        items.map((item) => {
          const id = ++rowId.current;
          if (!item || typeof item !== "object" || Array.isArray(item))
            return {
              id,
              payload: {},
              poster: null,
              ignored: [],
              errors: {},
              invalidMessage: "Each entry must be a movie object.",
            };
          const source = item as Record<string, unknown>;
          const payload = normalizeRecord(source);
          return {
            id,
            payload,
            poster: null,
            ignored: Object.keys(source).filter((key) => !allowedKeys.includes(key)),
            errors: validatePayload(payload),
          };
        }),
      );
      setStep(2);
    } catch {
      return;
    }
  };
  const updatePoster = (id: number, file: File | null) => {
    if (
      file &&
      (file.size > 5 * 1024 * 1024 ||
        !["image/jpeg", "image/png", "image/webp"].includes(file.type))
    ) {
      setRows((current) =>
        current.map((row) =>
          row.id === id
            ? {
                ...row,
                errors: {
                  ...row.errors,
                  poster:
                    file.size > 5 * 1024 * 1024
                      ? "Poster must be 5 MB or smaller"
                      : "Use a JPG, PNG or WebP poster.",
                },
              }
            : row,
        ),
      );
      return;
    }
    setRows((current) =>
      current.map((row) => {
        if (row.id !== id) return row;
        const errors = { ...row.errors };
        delete errors["poster"];
        return { ...row, poster: file, errors };
      }),
    );
  };
  const sendRows = async (target: ImportRow[]) => {
    let succeeded = 0;
    setRunning(true);
    setStep(3);
    setRows((current) =>
      current.map((row) =>
        target.some((item) => item.id === row.id) ? { ...row, result: "pending" } : row,
      ),
    );
    for (const row of target) {
      setActiveId(row.id);
      try {
        const payload = payloadFromRow(row);
        const fd = new FormData();
        fd.append("request", new Blob([JSON.stringify(payload)], { type: "application/json" }));
        if (row.poster) fd.append("poster", row.poster);
        await moviesApi.create(fd);
        succeeded++;
        setRows((current) =>
          current.map((item) => (item.id === row.id ? { ...item, result: "success" } : item)),
        );
      } catch (error) {
        const status = (error as { response?: { status?: number } })?.response?.status;
        const message =
          status === 409
            ? "This movie already exists in this language."
            : getApiErrorMessage(error);
        setRows((current) =>
          current.map((item) =>
            item.id === row.id ? { ...item, result: "failed", serverMessage: message } : item,
          ),
        );
      } finally {
        setActiveId(null);
      }
    }
    setRunning(false);
    await client.invalidateQueries({ queryKey: adminKeys.movies() });
    toast.success(`${succeeded} movies imported`);
  };
  const startImport = () => void sendRows(eligible);
  const retryFailed = () => void sendRows(rows.filter((row) => row.result === "failed"));
  const downloadFailed = () => {
    const failed = rows.filter((row) => row.result === "failed").map((row) => payloadFromRow(row));
    const blob = new Blob([JSON.stringify(failed, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "failed-movies.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (step === 1) {
      startReview();
      return;
    }
    if (step === 2) {
      startImport();
      return;
    }
    if (!running) onOpenChange(false);
  };
  const statusFor = (row: ImportRow) => rowStatus(row, duplicateIds.has(row.id));
  const imported = rows.filter((row) => row.result === "success").length;
  const progressTotal = eligible.length + imported;
  const doneCount = rows.filter(
    (row) => row.result === "success" || row.result === "failed",
  ).length;
  const sample = {
    movieName: "...",
    durationInMinutes: 150,
    language: "TELUGU",
    genres: ["ACTION", "THRILLER"],
    certificate: "UA13",
    movieStatus: "NOW_SHOWING",
    releaseDate: "2026-11-20",
    trailerUrl: "https://...",
    synopsis: "...",
  };
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Import movies from JSON"
      description="Paste, review and import movie records."
      submitting={running}
      submitDisabled={
        step === 1
          ? !!parsed.error || parsed.shapeError || parsed.count < 1 || parsed.count > 50
          : step === 2
            ? eligible.length === 0
            : false
      }
      onSubmit={submit}
      submitLabel={step === 1 ? "Next" : step === 2 ? `Import ${eligible.length} movies` : "Done"}
      className="sm:max-w-6xl"
    >
      <div className="space-y-5">
        <div className="flex items-center gap-2" aria-label={`Step ${step} of 3`}>
          {(["Paste", "Review", "Import"] as const).map((label, index) => (
            <div key={label} className="flex flex-1 items-center gap-2">
              <div
                className={`flex size-8 shrink-0 items-center justify-center rounded-full border text-sm ${step === index + 1 ? "border-accent bg-accent-soft text-text-primary" : "border-subtle bg-surface text-text-muted"}`}
              >
                {index + 1}
              </div>
              <span
                className={`text-sm ${step === index + 1 ? "font-medium text-text-primary" : "text-text-muted"}`}
              >
                {label}
              </span>
              {index < 2 && <div className="h-px flex-1 bg-border" />}
            </div>
          ))}
        </div>
        {step === 1 && (
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label htmlFor="movie-json">JSON data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" variant="ghost" size="sm">
                    <HelpCircle className="size-4" />
                    Format
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className="max-h-[70dvh] w-[min(32rem,calc(100vw-2rem))] overflow-auto"
                >
                  <p className="mb-2 text-sm font-medium">Expected movie shape</p>
                  <pre className="overflow-x-auto rounded-md bg-page-muted p-3 text-xs text-text-secondary">
                    {JSON.stringify(sample, null, 2)}
                  </pre>
                  <div className="mt-3 space-y-2 text-xs text-text-secondary">
                    <p>
                      <strong>Languages:</strong> {values(languageOptions).join(", ")}
                    </p>
                    <p>
                      <strong>Genres:</strong> {values(genreOptions).join(", ")}
                    </p>
                    <p>
                      <strong>Certificates:</strong> {values(certificateOptions).join(", ")}
                    </p>
                    <p>
                      <strong>Movie statuses:</strong> {values(movieStatusOptions).join(", ")}
                    </p>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <textarea
              id="movie-json"
              {...pasteForm.register("jsonText")}
              placeholder={"Paste one movie object or an array of movie objects here…"}
              className="min-h-[280px] w-full resize-y rounded-md border border-subtle bg-surface p-3 font-mono text-xs text-text-primary placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              spellCheck={false}
            />
            <p className="text-xs text-text-muted">
              Use exactly the same name for other language editions so they appear as one movie.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void file.text().then(setText);
                event.target.value = "";
              }}
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                <FileUp className="size-4" />
                Load .json file
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setText(JSON.stringify(example, null, 2))}
              >
                Insert example
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  try {
                    setText(JSON.stringify(JSON.parse(text), null, 2));
                  } catch {
                    // Leave invalid JSON untouched so it can be corrected in the editor.
                  }
                }}
              >
                Format
              </Button>
              <Button type="button" variant="ghost" onClick={() => setText("")}>
                Clear
              </Button>
            </div>
            <p
              aria-live="polite"
              className={`text-sm ${parsed.error ? "text-danger" : "text-text-secondary"}`}
            >
              {parsed.error
                ? `Invalid JSON: ${parsed.error}`
                : `${parsed.count} ${parsed.count === 1 ? "movie" : "movies"} found`}
              {!parsed.error && parsed.count > 50 && (
                <span className="text-danger"> (maximum 50)</span>
              )}
              {parsed.shapeError && (
                <span className="text-danger"> Every array entry must be a movie object.</span>
              )}
            </p>
          </section>
        )}
        {step === 2 && (
          <section className="space-y-3">
            <p className="text-sm text-text-secondary">
              {summary.ready} ready, {summary.attention} need attention, {summary.skipped} skipped
            </p>
            <div className="overflow-x-auto rounded-md border border-subtle">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="bg-page-muted text-xs text-text-secondary">
                  <tr>
                    {[
                      "#",
                      "Movie name",
                      "Certificate",
                      "Duration",
                      "Genres",
                      "Status",
                      "Release date",
                      "Poster",
                      "Row status",
                      "",
                    ].map((heading, index) => (
                      <th key={`${heading}-${index}`} className="px-3 py-2 font-medium">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle">
                  {rows.map((row, index) => {
                    const status = statusFor(row);
                    const movieName = String(row.payload["movieName"] ?? "Movie");
                    return (
                      <tr key={row.id} className="align-top">
                        <td className="px-3 py-3">{index + 1}</td>
                        <td className="min-w-44 px-3 py-3">
                          <p className="max-w-48 truncate font-medium" title={movieName}>
                            {movieName || "—"}
                          </p>
                          {typeof row.payload["language"] === "string" && (
                            <Badge variant="outline" className="mt-1">
                              {row.payload["language"]}
                            </Badge>
                          )}
                          <select
                            aria-label={`Language for ${movieName}`}
                            className={`${selectClass} mt-2`}
                            value={String(row.payload["language"] ?? "")}
                            onChange={(event) => changeRow(row.id, "language", event.target.value)}
                          >
                            <option value="">Select language</option>
                            {languageOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          {row.errors["language"] && (
                            <FieldError message={row.errors["language"]} />
                          )}
                          {row.ignored.length > 0 && (
                            <p className="mt-1 max-w-44 text-xs text-text-muted">
                              Ignored fields: {row.ignored.join(", ")}
                            </p>
                          )}
                          {row.invalidMessage && (
                            <p className="mt-1 text-xs text-danger">{row.invalidMessage}</p>
                          )}
                          {row.errors["movieName"] && (
                            <FieldError message={row.errors["movieName"]} />
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <select
                            aria-label={`Certificate for ${movieName}`}
                            className={selectClass}
                            value={String(row.payload["certificate"] ?? "")}
                            onChange={(event) =>
                              changeRow(row.id, "certificate", event.target.value)
                            }
                          >
                            <option value="">Select</option>
                            {certificateOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <FieldError message={row.errors["certificate"]} />
                        </td>
                        <td className="w-28 px-3 py-3">
                          <Input
                            aria-label={`Duration for ${movieName}`}
                            type="number"
                            min={30}
                            max={500}
                            value={String(row.payload["durationInMinutes"] ?? "")}
                            onChange={(event) =>
                              changeRow(
                                row.id,
                                "durationInMinutes",
                                event.target.value === "" ? "" : Number(event.target.value),
                              )
                            }
                          />
                          <FieldError message={row.errors["durationInMinutes"]} />
                        </td>
                        <td className="max-w-40 px-3 py-3">
                          <div className="flex flex-wrap gap-1">
                            {Array.isArray(row.payload["genres"])
                              ? row.payload["genres"].map((genre, index) => (
                                  <Badge key={`${genre}-${index}`} variant="secondary">
                                    {String(genre)}
                                  </Badge>
                                ))
                              : "—"}
                          </div>
                          {row.errors["genres"] && <FieldError message={row.errors["genres"]} />}
                        </td>
                        <td className="px-3 py-3">
                          <select
                            aria-label={`Status for ${movieName}`}
                            className={selectClass}
                            value={String(row.payload["movieStatus"] ?? "")}
                            onChange={(event) =>
                              changeRow(row.id, "movieStatus", event.target.value)
                            }
                          >
                            <option value="">Select</option>
                            {movieStatusOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <FieldError message={row.errors["movieStatus"]} />
                        </td>
                        <td className="px-3 py-3">
                          <Input
                            aria-label={`Release date for ${movieName}`}
                            type="date"
                            value={String(row.payload["releaseDate"] ?? "")}
                            onChange={(event) =>
                              changeRow(row.id, "releaseDate", event.target.value)
                            }
                          />
                          <FieldError message={row.errors["releaseDate"]} />
                        </td>
                        <td className="min-w-32 px-3 py-3">
                          <label className="flex cursor-pointer flex-col gap-2 text-xs text-text-secondary">
                            <span>
                              {row.poster ? (
                                <img
                                  src={URL.createObjectURL(row.poster)}
                                  alt="Poster preview"
                                  className="h-16 w-12 rounded object-cover"
                                />
                              ) : (
                                <span className="flex h-16 w-12 items-center justify-center rounded border border-dashed border-subtle">
                                  <FileUp className="size-4" />
                                </span>
                              )}
                            </span>
                            <span>{row.poster?.name ?? "Upload poster"}</span>
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="sr-only"
                              onChange={(event) => {
                                updatePoster(row.id, event.target.files?.[0] ?? null);
                                event.target.value = "";
                              }}
                            />
                          </label>
                          {row.errors["poster"] && <FieldError message={row.errors["poster"]} />}
                        </td>
                        <td className="px-3 py-3">
                          <StatusBadge tone={rowTone(status)}>{status}</StatusBadge>
                        </td>
                        <td className="px-3 py-3">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Remove ${movieName}`}
                            onClick={() =>
                              setRows((current) => current.filter((item) => item.id !== row.id))
                            }
                          >
                            <X className="size-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
        {step === 3 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span>{running ? "Importing movies…" : "Import complete"}</span>
              <span>
                {doneCount}/{rows.length}
              </span>
            </div>
            <Progress value={progressTotal ? (doneCount / progressTotal) * 100 : 0} />
            <div className="max-h-[40dvh] space-y-2 overflow-y-auto">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center gap-3 rounded-md border border-subtle p-3"
                >
                  <span className="flex size-5 items-center justify-center">
                    {row.result === "pending" && activeId === row.id ? (
                      <LoaderCircle className="size-4 animate-spin text-text-secondary" />
                    ) : row.result === "success" ? (
                      <Check className="size-4 text-success" />
                    ) : row.result === "failed" ? (
                      <CircleX className="size-4 text-danger" />
                    ) : (
                      <CircleAlert className="size-4 text-text-muted" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {String(row.payload["movieName"] ?? "Invalid movie")}
                  </span>
                  {row.result === "failed" && (
                    <span className="max-w-[50%] text-xs text-danger">{row.serverMessage}</span>
                  )}
                </div>
              ))}
            </div>
            {!running && (
              <div className="rounded-md border border-subtle bg-page-muted p-4">
                <p className="font-medium">{imported} created</p>
                {rows.some((row) => row.result === "failed") && (
                  <>
                    <p className="mt-2 text-sm text-text-secondary">Failed movies</p>
                    <ul className="mt-1 space-y-1 text-sm">
                      {rows
                        .filter((row) => row.result === "failed")
                        .map((row) => (
                          <li key={row.id}>
                            <span className="font-medium">
                              {String(row.payload["movieName"] ?? "Movie")}:
                            </span>{" "}
                            <span className="text-text-secondary">{row.serverMessage}</span>
                          </li>
                        ))}
                    </ul>
                  </>
                )}
              </div>
            )}
          </section>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-subtle pt-3">
          {step > 1 && (
            <Button
              type="button"
              variant="outline"
              disabled={running}
              onClick={() => setStep(step === 3 ? 2 : 1)}
            >
              Back
            </Button>
          )}
          <div className="ml-auto flex flex-wrap gap-2">
            {step === 3 && !running && rows.some((row) => row.result === "failed") && (
              <>
                <Button type="button" variant="outline" onClick={retryFailed}>
                  Retry failed
                </Button>
                <Button type="button" variant="outline" onClick={downloadFailed}>
                  Download failed rows as JSON
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </FormDialog>
  );
}
