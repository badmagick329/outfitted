import Link from "next/link";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { ArchiveRestore } from "lucide-react";
import { requireUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { wardrobeItems } from "@/lib/db/schema";

export default async function ArchivePage() {
  const items = await db
    .select()
    .from(wardrobeItems)
    .where(
      and(eq(wardrobeItems.userId, await requireUserId()), isNotNull(wardrobeItems.archivedAt)),
    )
    .orderBy(desc(wardrobeItems.archivedAt));
  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">PAST PIECES</p>
          <h1>Archive</h1>
          <p className="muted">Archived pieces are kept out of outfit suggestions.</p>
        </div>
      </header>
      <section className="archive-list">
        {items.length ? (
          items.map((item) => (
            <Link href={`/items/${item.id}`} className="archive-row" key={item.id}>
              <ArchiveRestore size={17} />
              <div>
                <strong>{item.name}</strong>
                <span>{item.category ?? "Garment"}</span>
              </div>
            </Link>
          ))
        ) : (
          <div className="empty-state compact">
            <h2>No archived garments</h2>
            <p>Archive pieces you no longer own instead of losing their record.</p>
          </div>
        )}
      </section>
    </>
  );
}
