"use client";
import { useState, useEffect } from "react";
import { signIn, signOut, useSession } from "next-auth/react";

type Post = {
  id: string;
  content: string;
  status: string;
  scheduledAt: string | null;
  createdAt: string;
};

export default function Home() {
  const { data: session } = useSession();
  const [content, setContent] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPosts = async () => {
    const res = await fetch("/api/posts");
    if (res.ok) setPosts(await res.json());
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (session) fetchPosts();
  }, [session]);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setLoading(true);
    await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content,
        scheduledAt: scheduledAt || null,
      }),
    });
    setContent("");
    setScheduledAt("");
    await fetchPosts();
    setLoading(false);
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F3F2EF]">
        <button
          onClick={() => signIn("linkedin")}
          className="bg-[#0A66C2] text-white px-6 py-3 rounded-full font-semibold hover:bg-[#004182] transition"
        >
          Sign in with LinkedIn
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F2EF] text-[#1D2226]">
      <header className="bg-[#0A66C2] text-white px-6 py-4 flex justify-between items-center">
        <h1 className="font-bold text-lg">Linktree</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm">{session.user?.email}</span>
          <button
            onClick={() => signOut()}
            className="text-sm underline hover:no-underline"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto py-8 px-4">
        <div className="bg-white rounded-lg shadow-sm p-5 mb-6">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What do you want to talk about?"
            rows={5}
            className="w-full border border-gray-300 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-[#0A66C2] resize-none"
          />
          <div className="flex items-center justify-between mt-3">
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
            <button
              onClick={handleSubmit}
              disabled={loading || !content.trim()}
              className="bg-[#0A66C2] text-white px-5 py-2 rounded-full font-semibold hover:bg-[#004182] disabled:opacity-50 transition"
            >
              {scheduledAt ? "Schedule" : "Save draft"}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {posts.map((post) => (
            <div key={post.id} className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex justify-between items-start mb-2">
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded ${
                    post.status === "PUBLISHED"
                      ? "bg-green-100 text-green-700"
                      : post.status === "SCHEDULED"
                      ? "bg-blue-100 text-[#0A66C2]"
                      : post.status === "FAILED"
                      ? "bg-red-100 text-red-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {post.status}
                </span>
                {post.scheduledAt && (
                  <span className="text-xs text-gray-500">
                    {new Date(post.scheduledAt).toLocaleString()}
                  </span>
                )}
              </div>
              <p className="text-sm whitespace-pre-wrap">{post.content}</p>
              <div className="mt-2 flex gap-3">
                {post.status !== "PUBLISHED" && (
                  <button
                    onClick={async () => {
                      await fetch(`/api/posts/${post.id}/publish`, { method: "POST" });
                      await fetchPosts();
                    }}
                    className="text-xs font-semibold text-[#0A66C2] hover:underline"
                  >
                    Publish now
                  </button>
                )}
                <button
                  onClick={async () => {
                    await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
                    await fetchPosts();
                  }}
                  className="text-xs font-semibold text-red-600 hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {posts.length === 0 && (
            <p className="text-center text-gray-500 text-sm py-8">
              No posts yet — write your first one above.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}