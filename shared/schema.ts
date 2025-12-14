import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Distributions table
export const distributions = pgTable("distributions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  websiteUrl: text("website_url").notNull(),
  logoUrl: text("logo_url"),
  baseDistro: text("base_distro"),
  desktopEnvironments: text("desktop_environments").array().notNull().default(sql`'{}'::text[]`),
}, (table) => [
  index("distributions_name_idx").on(table.name),
  index("distributions_base_distro_idx").on(table.baseDistro),
]);

export const distributionsRelations = relations(distributions, ({ many, one }) => ({
  releases: many(releases),
  technicalSpecs: one(technicalSpecs),
}));

// Technical specifications table (one-to-one with distributions)
export const technicalSpecs = pgTable("technical_specs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  distroId: integer("distro_id").notNull().references(() => distributions.id, { onDelete: "cascade" }).unique(),
  packageManager: text("package_manager"),
  initSystem: text("init_system"),
  releaseModel: text("release_model"),
  kernelVersion: text("kernel_version"),
  license: text("license"),
}, (table) => [
  index("technical_specs_distro_id_idx").on(table.distroId),
]);

export const technicalSpecsRelations = relations(technicalSpecs, ({ one }) => ({
  distribution: one(distributions, {
    fields: [technicalSpecs.distroId],
    references: [distributions.id],
  }),
}));

// Releases table
export const releases = pgTable("releases", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  distroId: integer("distro_id").notNull().references(() => distributions.id, { onDelete: "cascade" }),
  versionNumber: text("version_number").notNull(),
  releaseDate: timestamp("release_date").notNull(),
  isLts: boolean("is_lts").notNull().default(false),
}, (table) => [
  index("releases_distro_id_idx").on(table.distroId),
  index("releases_release_date_idx").on(table.releaseDate),
]);

export const releasesRelations = relations(releases, ({ one, many }) => ({
  distribution: one(distributions, {
    fields: [releases.distroId],
    references: [distributions.id],
  }),
  downloads: many(downloads),
}));

// Downloads table
export const downloads = pgTable("downloads", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  releaseId: integer("release_id").notNull().references(() => releases.id, { onDelete: "cascade" }),
  architecture: text("architecture").notNull(), // amd64, arm64
  isoUrl: text("iso_url").notNull(),
  torrentUrl: text("torrent_url"),
  checksum: text("checksum"),
  downloadSize: text("download_size"),
}, (table) => [
  index("downloads_release_id_idx").on(table.releaseId),
  index("downloads_architecture_idx").on(table.architecture),
]);

export const downloadsRelations = relations(downloads, ({ one }) => ({
  release: one(releases, {
    fields: [downloads.releaseId],
    references: [releases.id],
  }),
}));

// News table
export const news = pgTable("news", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: text("title").notNull(),
  sourceUrl: text("source_url").notNull(),
  publishedAt: timestamp("published_at").notNull().default(sql`now()`),
}, (table) => [
  index("news_published_at_idx").on(table.publishedAt),
]);

// Download clicks table for tracking popularity
export const downloadClicks = pgTable("download_clicks", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  distroId: integer("distro_id").notNull().references(() => distributions.id, { onDelete: "cascade" }),
  clickedAt: timestamp("clicked_at").notNull().default(sql`now()`),
}, (table) => [
  index("download_clicks_distro_id_idx").on(table.distroId),
  index("download_clicks_clicked_at_idx").on(table.clickedAt),
]);

export const downloadClicksRelations = relations(downloadClicks, ({ one }) => ({
  distribution: one(distributions, {
    fields: [downloadClicks.distroId],
    references: [distributions.id],
  }),
}));

// Insert schemas
export const insertDistributionSchema = createInsertSchema(distributions).omit({ id: true });
export const insertReleaseSchema = createInsertSchema(releases).omit({ id: true });
export const insertDownloadSchema = createInsertSchema(downloads).omit({ id: true });
export const insertNewsSchema = createInsertSchema(news).omit({ id: true });
export const insertDownloadClickSchema = createInsertSchema(downloadClicks).omit({ id: true });
export const insertTechnicalSpecsSchema = createInsertSchema(technicalSpecs).omit({ id: true });

// Update schema for download URLs
export const updateDownloadUrlSchema = z.object({
  isoUrl: z.string().url("Must be a valid URL"),
  torrentUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

export type UpdateDownloadUrl = z.infer<typeof updateDownloadUrlSchema>;

// Types
export type Distribution = typeof distributions.$inferSelect;
export type InsertDistribution = z.infer<typeof insertDistributionSchema>;

export type Release = typeof releases.$inferSelect;
export type InsertRelease = z.infer<typeof insertReleaseSchema>;

export type Download = typeof downloads.$inferSelect;
export type InsertDownload = z.infer<typeof insertDownloadSchema>;

export type News = typeof news.$inferSelect;
export type InsertNews = z.infer<typeof insertNewsSchema>;

export type DownloadClick = typeof downloadClicks.$inferSelect;
export type InsertDownloadClick = z.infer<typeof insertDownloadClickSchema>;

export type TechnicalSpecs = typeof technicalSpecs.$inferSelect;
export type InsertTechnicalSpecs = z.infer<typeof insertTechnicalSpecsSchema>;

export type TopDistro = {
  distroId: number;
  name: string;
  clickCount: number;
};

// Extended types for API responses
export type ReleaseWithDownloads = Release & {
  downloads: Download[];
};

export type DistributionWithReleases = Distribution & {
  releases: ReleaseWithDownloads[];
};

export type DistributionWithLatestRelease = Distribution & {
  latestVersion: string | null;
  isLatestLts: boolean;
  availableArchitectures: string[];
};

export type DistributionWithSpecs = Distribution & {
  technicalSpecs: TechnicalSpecs | null;
};
