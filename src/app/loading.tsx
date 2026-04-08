export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
        <div className="w-5 h-5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
        <div className="w-5 h-5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
}
