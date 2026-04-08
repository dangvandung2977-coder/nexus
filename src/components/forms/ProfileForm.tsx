"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { updateProfile, uploadAvatar } from "@/actions/profile";
import { updateProfileSchema, type UpdateProfileInput } from "@/lib/validations/profile";
import type { Profile } from "@/types";

interface ProfileFormProps {
  profile: Profile;
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? "");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      username: profile.username,
      display_name: profile.display_name ?? "",
      bio: profile.bio ?? "",
      website: profile.website ?? "",
      twitter: profile.twitter ?? "",
      github: profile.github ?? "",
      discord: profile.discord ?? "",
    },
  });

  const onSubmit = async (data: UpdateProfileInput) => {
    const result = await updateProfile(data);
    if (result.error) toast.error(result.error);
    else toast.success("Profile updated!");
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    const fd = new FormData();
    fd.append("file", file);
    const result = await uploadAvatar(fd);
    if (result.error) toast.error(result.error);
    else { setAvatarUrl(result.url!); toast.success("Avatar updated!"); }
    setUploadingAvatar(false);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Avatar */}
      <div className="flex items-center gap-5">
        <div className="relative">
          <Avatar className="w-20 h-20">
            <AvatarImage src={avatarUrl} />
            <AvatarFallback className="text-xl bg-primary/20 text-primary">
              {(profile.display_name ?? profile.username).charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <label
            htmlFor="avatar-upload"
            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center cursor-pointer hover:bg-primary/80 transition-colors shadow-md"
          >
            {uploadingAvatar ? (
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            ) : (
              <Camera className="w-4 h-4 text-white" />
            )}
          </label>
          <input
            id="avatar-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
          />
        </div>
        <div>
          <p className="font-medium">Profile Photo</p>
          <p className="text-sm text-muted-foreground">PNG, JPG, WebP · Max 5MB</p>
        </div>
      </div>

      <Separator />

      {/* Identity */}
      <div className="space-y-4">
        <h3 className="font-semibold">Identity</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="username">Username *</Label>
            <div className="flex">
              <span className="flex items-center px-3 border border-r-0 border-border rounded-l-md bg-muted text-muted-foreground text-sm">@</span>
              <Input id="username" className="rounded-l-none" {...register("username")} />
            </div>
            {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="display_name">Display Name</Label>
            <Input id="display_name" placeholder="Your Name" {...register("display_name")} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            rows={3}
            placeholder="Tell the community about yourself..."
            {...register("bio")}
          />
          {errors.bio && <p className="text-xs text-destructive">{errors.bio.message}</p>}
        </div>
      </div>

      <Separator />

      {/* Social Links */}
      <div className="space-y-4">
        <h3 className="font-semibold">Social Links</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="website">Website</Label>
            <Input id="website" placeholder="https://yoursite.com" {...register("website")} />
            {errors.website && <p className="text-xs text-destructive">{errors.website.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="twitter">Twitter / X</Label>
            <div className="flex">
              <span className="flex items-center px-3 border border-r-0 border-border rounded-l-md bg-muted text-muted-foreground text-sm">@</span>
              <Input id="twitter" className="rounded-l-none" placeholder="handle" {...register("twitter")} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="github">GitHub</Label>
            <div className="flex">
              <span className="flex items-center px-3 border border-r-0 border-border rounded-l-md bg-muted text-muted-foreground text-sm">@</span>
              <Input id="github" className="rounded-l-none" placeholder="username" {...register("github")} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="discord">Discord</Label>
            <Input id="discord" placeholder="username" {...register("discord")} />
          </div>
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
        ) : (
          "Save Changes"
        )}
      </Button>
    </form>
  );
}
