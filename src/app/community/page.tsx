import Link from "next/link";
import Image from "next/image";
import { Heart, MessageCircle, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CommunityPage() {
  let posts: Awaited<ReturnType<typeof prisma.communityPost.findMany>> = [];
  try {
    posts = await prisma.communityPost.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        user: { select: { name: true, avatarUrl: true } },
        _count: { select: { comments: true, likes: true } },
      },
    });
  } catch {
    posts = [];
  }

  return (
    <div className="container-page py-10">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-koi-muted">Komunitas</p>
          <h1 className="heading-display text-3xl text-white md:text-4xl">
            Showcase & Diskusi Koi
          </h1>
        </div>
        <Link href="/community/new" className="btn-gold">
          <Users size={14} /> Post Baru
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-koi-muted">Belum ada post komunitas. Jadilah yang pertama!</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => {
            const post = p as unknown as {
              id: string;
              title: string;
              body: string;
              imageUrl: string | null;
              likeCount: number;
              user: { name: string };
              _count: { comments: number; likes: number };
            };
            return (
              <article key={post.id} className="card overflow-hidden">
                {post.imageUrl && (
                  <div className="relative aspect-[4/3]">
                    <Image src={post.imageUrl} alt={post.title} fill className="object-cover" sizes="33vw" />
                  </div>
                )}
                <div className="space-y-2 p-4">
                  <p className="font-display text-lg font-semibold text-white">
                    {post.title}
                  </p>
                  <p className="line-clamp-3 text-sm text-koi-platinum/80">{post.body}</p>
                  <div className="flex items-center justify-between border-t border-koi-border pt-2 text-xs text-koi-muted">
                    <span>by {post.user.name}</span>
                    <div className="flex gap-3">
                      <span className="flex items-center gap-1">
                        <Heart size={12} /> {post._count.likes}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle size={12} /> {post._count.comments}
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="mt-10 card p-6 text-sm text-koi-muted">
        Fitur lengkap komunitas (follow seller, like, comment, live chat antar kolektor)
        masih dalam development. MVP ini menyediakan struktur data & tampilan dasarnya.
      </div>
    </div>
  );
}
