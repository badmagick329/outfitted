/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Plus, Search, Shirt } from "lucide-react";
import { requireUserId } from "@/lib/auth";
import { getWardrobeWithPhotos } from "@/lib/wardrobe";

export default async function WardrobePage() {
  const items = await getWardrobeWithPhotos(await requireUserId());
  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">MY INVENTORY</p>
          <h1>Your wardrobe</h1>
          <p className="muted">
            {items.length} active {items.length === 1 ? "piece" : "pieces"}
          </p>
        </div>
        <Link href="/upload" className="primary-action">
          <Plus size={18} /> Add garment
        </Link>
      </header>
      <div className="toolbar">
        <div className="search">
          <Search size={16} />
          <input placeholder="Search wardrobe" aria-label="Search wardrobe" />
        </div>
        <span>Showing everything</span>
      </div>
      {items.length ? (
        <div className="wardrobe-grid">
          {items.map((item) => (
            <Link href={`/items/${item.id}`} className="garment-card" key={item.id}>
              {item.photos[0] ? (
                <img src={`/api/photos/${item.photos[0].id}`} alt={item.name} />
              ) : (
                <div className="photo-placeholder" />
              )}
              <div className="garment-meta">
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.category ?? "Processing details"}</span>
                </div>
                <span className={`status ${item.analysisStatus}`}>{item.analysisStatus}</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <section className="empty-state">
          <span className="brand-mark">
            <Shirt size={24} />
          </span>
          <h2>Start with a garment you reach for</h2>
          <p>
            Photograph it from a couple of angles. We’ll turn it into a useful, editable wardrobe
            record.
          </p>
          <Link href="/upload" className="primary-action">
            <Plus size={18} /> Add your first garment
          </Link>
        </section>
      )}
    </>
  );
}
