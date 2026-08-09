/* eslint-disable @next/next/no-img-element */
import { notFound } from "next/navigation";
import { ItemEditor } from "@/components/item-editor";
import { requireUserId } from "@/lib/auth";
import { getOwnedItem, getOwnedPhotos } from "@/lib/wardrobe";

export default async function ItemPage({ params }: PageProps<"/items/[id]">) {
  const { id } = await params; const userId = await requireUserId(); const item = await getOwnedItem(userId, id); if (!item) notFound(); const photos = await getOwnedPhotos(userId, id);
  return <><header className="page-header"><div><p className="eyebrow">GARMENT RECORD</p><h1>{item.name}</h1><p className="muted">{item.analysisStatus === "complete" ? "AI details can be refined below." : item.analysisStatus === "failed" ? "Analysis needs another try." : "We’re reading the details in the background."}</p></div><span className={`status ${item.analysisStatus}`}>{item.analysisStatus}</span></header><div className="item-layout"><div className="photo-stack">{photos.map((photo) => <img key={photo.id} src={`/api/photos/${photo.id}`} alt={item.name} />)}</div><ItemEditor key={`${item.id}-${item.updatedAt.toISOString()}`} item={item} /></div></>;
}
