import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Plus, Trash2, Terminal, Loader2, AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import type { Distribution } from "@shared/schema";

const downloadSchema = z.object({
  architecture: z.enum(["amd64", "arm64"]),
  isoUrl: z.string().url("Must be a valid URL"),
  torrentUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  checksum: z.string().optional(),
  downloadSize: z.string().optional(),
});

const formSchema = z.object({
  distroId: z.string().min(1, "Please select a distribution"),
  versionNumber: z.string().min(1, "Version number is required"),
  releaseDate: z.string().min(1, "Release date is required"),
  isLts: z.boolean(),
  downloads: z.array(downloadSchema).min(1, "At least one download is required"),
});

type FormValues = z.infer<typeof formSchema>;

export default function AddRelease() {
  const { toast } = useToast();

  const { data: distributions = [], isLoading: distributionsLoading } = useQuery<Distribution[]>({
    queryKey: ["/api/distributions"],
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      distroId: "",
      versionNumber: "",
      releaseDate: "",
      isLts: false,
      downloads: [
        {
          architecture: "amd64",
          isoUrl: "",
          torrentUrl: "",
          checksum: "",
          downloadSize: "",
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "downloads",
  });

  const isSubmitting = form.formState.isSubmitting;

  async function onSubmit(values: FormValues) {
    if (!isSupabaseConfigured()) {
      toast({
        title: "Error",
        description: "Supabase is not configured. Please set the environment variables.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: release, error: releaseError } = await supabase
        .from("releases")
        .insert({
          distro_id: parseInt(values.distroId),
          version_number: values.versionNumber,
          release_date: new Date(values.releaseDate).toISOString(),
          is_lts: values.isLts,
        })
        .select()
        .single();

      if (releaseError) {
        throw releaseError;
      }

      const downloadsToInsert = values.downloads.map((download) => ({
        release_id: release.id,
        architecture: download.architecture,
        iso_url: download.isoUrl,
        torrent_url: download.torrentUrl || null,
        checksum: download.checksum || null,
        download_size: download.downloadSize || null,
      }));

      const { error: downloadsError } = await supabase
        .from("downloads")
        .insert(downloadsToInsert);

      if (downloadsError) {
        throw downloadsError;
      }

      toast({
        title: "Success",
        description: "Release and downloads added successfully",
      });

      form.reset();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add release",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-surface">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center">
                <Terminal className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-serif font-bold text-xl text-foreground">
                Admin Dashboard
              </span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {!isSupabaseConfigured() && (
          <Alert variant="destructive" data-testid="alert-supabase-warning">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Supabase Not Configured</AlertTitle>
            <AlertDescription>
              Please set the VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables to enable database functionality.
            </AlertDescription>
          </Alert>
        )}
        <Card>
          <CardHeader>
            <CardTitle data-testid="text-page-title">Add New Release</CardTitle>
            <CardDescription>
              Add a new release with download links for a distribution
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="distroId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Distribution</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={distributionsLoading}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-distribution">
                            <SelectValue placeholder="Select a distribution" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {distributions.map((distro) => (
                            <SelectItem
                              key={distro.id}
                              value={String(distro.id)}
                              data-testid={`select-option-distro-${distro.id}`}
                            >
                              {distro.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="versionNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Version Number</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., 22.04.3"
                            data-testid="input-version-number"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="releaseDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Release Date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            data-testid="input-release-date"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="isLts"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-is-lts"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Long Term Support (LTS)</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <h3 className="font-semibold text-lg">Downloads</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        append({
                          architecture: "amd64",
                          isoUrl: "",
                          torrentUrl: "",
                          checksum: "",
                          downloadSize: "",
                        })
                      }
                      data-testid="button-add-download"
                    >
                      <Plus className="w-4 h-4" />
                      Add Download
                    </Button>
                  </div>

                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="p-4 border border-border rounded-md space-y-4"
                      data-testid={`download-entry-${index}`}
                    >
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <span className="text-sm font-medium text-muted-foreground">
                          Download #{index + 1}
                        </span>
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(index)}
                            data-testid={`button-remove-download-${index}`}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name={`downloads.${index}.architecture`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Architecture</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger data-testid={`select-architecture-${index}`}>
                                    <SelectValue placeholder="Select architecture" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="amd64">amd64</SelectItem>
                                  <SelectItem value="arm64">arm64</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`downloads.${index}.downloadSize`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Download Size</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="e.g., 2.5 GB"
                                  data-testid={`input-download-size-${index}`}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name={`downloads.${index}.isoUrl`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ISO URL</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="https://..."
                                data-testid={`input-iso-url-${index}`}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`downloads.${index}.torrentUrl`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Torrent URL (optional)</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="https://..."
                                data-testid={`input-torrent-url-${index}`}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`downloads.${index}.checksum`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Checksum (optional)</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="SHA256 hash..."
                                data-testid={`input-checksum-${index}`}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                  data-testid="button-submit"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Adding Release...
                    </>
                  ) : (
                    "Add Release"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
