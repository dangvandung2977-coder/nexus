"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Reply, Trash2, Loader2, ChevronDown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/utils";
import { createCommentSchema, type CreateCommentInput } from "@/lib/validations/comment";
import { createComment, deleteComment } from "@/actions/comments";
import { toast } from "sonner";
import type { CommentWithAuthor } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { EmptyState } from "@/components/shared/EmptyState";

interface CommentThreadProps {
  listingId: string;
  creatorId: string;
  initialComments: CommentWithAuthor[];
}

export function CommentThread({ listingId, creatorId, initialComments }: CommentThreadProps) {
  const [comments, setComments] = useState(initialComments);
  const [userId, setUserId] = useState<string | null>(null);

  // Get current user
  useState(() => {
    createClient().auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  });

  const handleNewComment = (comment: CommentWithAuthor) => {
    setComments((prev) => [...prev, { ...comment, replies: [] }]);
  };

  const handleDeleteComment = async (commentId: string) => {
    const result = await deleteComment(commentId);
    if (result.error) { toast.error(result.error); return; }
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    toast.success("Comment deleted.");
  };

  return (
    <div className="space-y-6">
      {/* New comment form */}
      <CommentForm listingId={listingId} onSuccess={handleNewComment} />

      {/* Comments list */}
      {comments.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="w-7 h-7 text-muted-foreground" />}
          title="No comments yet"
          description="Be the first to share your thoughts!"
        />
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              listingId={listingId}
              creatorId={creatorId}
              currentUserId={userId}
              onDelete={handleDeleteComment}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface CommentFormProps {
  listingId: string;
  parentId?: string;
  onSuccess: (comment: CommentWithAuthor) => void;
  onCancel?: () => void;
  compact?: boolean;
}

function CommentForm({ listingId, parentId, onSuccess, onCancel, compact }: CommentFormProps) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CreateCommentInput>({
    resolver: zodResolver(createCommentSchema),
    defaultValues: { parent_id: parentId },
  });

  const onSubmit = async (data: CreateCommentInput) => {
    const result = await createComment(listingId, data);
    if (result.error) { toast.error(result.error); return; }
    reset();
    onSuccess(result.data as unknown as CommentWithAuthor);
    onCancel?.();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
      <Textarea
        placeholder={parentId ? "Write a reply..." : "Share your thoughts..."}
        rows={compact ? 2 : 3}
        {...register("body")}
        className="resize-none text-sm"
      />
      {errors.body && <p className="text-xs text-destructive">{errors.body.message}</p>}
      <div className="flex gap-2 justify-end">
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        )}
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : parentId ? "Reply" : "Comment"}
        </Button>
      </div>
    </form>
  );
}

interface CommentItemProps {
  comment: CommentWithAuthor;
  listingId: string;
  creatorId: string;
  currentUserId: string | null;
  onDelete: (id: string) => void;
}

function CommentItem({ comment, listingId, creatorId, currentUserId, onDelete }: CommentItemProps) {
  const [showReply, setShowReply] = useState(false);
  const [replies, setReplies] = useState(comment.replies ?? []);

  const handleNewReply = (reply: CommentWithAuthor) => {
    setReplies((prev) => [...prev, reply]);
    setShowReply(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3"
    >
      <Avatar className="w-8 h-8 flex-shrink-0 mt-0.5">
        <AvatarImage src={comment.profiles?.avatar_url ?? undefined} />
        <AvatarFallback className="text-xs bg-primary/20 text-primary">
          {comment.profiles?.username?.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold">
            {comment.profiles?.display_name ?? comment.profiles?.username}
          </span>
          {comment.author_id === creatorId && (
            <Badge variant="secondary" className="h-4 px-1.5 py-0 text-[10px] font-bold bg-primary/10 text-primary border-primary/20">
              Author
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(comment.created_at)}
          </span>
        </div>
        <p className="text-sm text-foreground/90 leading-relaxed mb-2">{comment.body}</p>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground"
            onClick={() => setShowReply(!showReply)}
          >
            <Reply className="w-3.5 h-3.5 mr-1" /> Reply
          </Button>
          {currentUserId === comment.author_id && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-destructive"
              onClick={() => onDelete(comment.id)}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
            </Button>
          )}
        </div>

        <AnimatePresence>
          {showReply && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-3 overflow-hidden"
            >
              <CommentForm
                listingId={listingId}
                parentId={comment.id}
                onSuccess={handleNewReply}
                onCancel={() => setShowReply(false)}
                compact
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Replies */}
        {replies.length > 0 && (
          <div className="mt-3 pl-4 border-l border-border space-y-3">
            {replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply as CommentWithAuthor}
                listingId={listingId}
                creatorId={creatorId}
                currentUserId={currentUserId}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
