export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          banner_url: string | null;
          bio: string | null;
          website: string | null;
          twitter: string | null;
          github: string | null;
          discord: string | null;
          role: "user" | "creator" | "moderator" | "admin";
          verified: boolean;
          status: "active" | "suspended" | "banned";
          ban_reason: string | null;
          ban_expires_at: string | null;
          banned_by: string | null;
          banned_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name?: string | null;
          avatar_url?: string | null;
          banner_url?: string | null;
          bio?: string | null;
          website?: string | null;
          twitter?: string | null;
          github?: string | null;
          discord?: string | null;
          role?: "user" | "creator" | "moderator" | "admin";
          verified?: boolean;
          status?: "active" | "suspended" | "banned";
          ban_reason?: string | null;
          ban_expires_at?: string | null;
          banned_by?: string | null;
          banned_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          banner_url?: string | null;
          bio?: string | null;
          website?: string | null;
          twitter?: string | null;
          github?: string | null;
          discord?: string | null;
          role?: "user" | "creator" | "moderator" | "admin";
          verified?: boolean;
          status?: "active" | "suspended" | "banned";
          ban_reason?: string | null;
          ban_expires_at?: string | null;
          banned_by?: string | null;
          banned_at?: string | null;
          updated_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          icon: string | null;
          color: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          icon?: string | null;
          color?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          name?: string;
          slug?: string;
          description?: string | null;
          icon?: string | null;
          color?: string | null;
          sort_order?: number;
        };
      };
      platforms: {
        Row: {
          id: string;
          name: string;
          slug: string;
          icon: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          icon?: string | null;
          created_at?: string;
        };
        Update: { name?: string; slug?: string; icon?: string | null };
      };
      listings: {
        Row: {
          id: string;
          creator_id: string;
          category_id: string | null;
          title: string;
          slug: string;
          short_description: string;
          description: string;
          cover_image_url: string | null;
          status: "draft" | "published" | "archived" | "flagged";
          moderation_status: "approved" | "pending_review" | "hidden" | "removed";
          moderation_reason: string | null;
          moderated_by: string | null;
          moderated_at: string | null;
          price: number;
          currency: string;
          external_url: string | null;
          youtube_url: string | null;
          license: string | null;
          is_open_source: boolean;
          platforms: string[];
          supported_versions: string[];
          dependencies: string[];
          popularity_score: number;
          view_count: number;
          download_count: number;
          favorite_count: number;
          featured: boolean;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          creator_id: string;
          category_id?: string | null;
          title: string;
          slug: string;
          short_description: string;
          description: string;
          cover_image_url?: string | null;
          status?: "draft" | "published" | "archived" | "flagged";
          moderation_status?: "approved" | "pending_review" | "hidden" | "removed";
          moderation_reason?: string | null;
          moderated_by?: string | null;
          moderated_at?: string | null;
          price?: number;
          currency?: string;
          external_url?: string | null;
          youtube_url?: string | null;
          license?: string | null;
          is_open_source?: boolean;
          platforms?: string[];
          supported_versions?: string[];
          dependencies?: string[];
          popularity_score?: number;
          view_count?: number;
          download_count?: number;
          favorite_count?: number;
          featured?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          category_id?: string | null;
          title?: string;
          slug?: string;
          short_description?: string;
          description?: string;
          cover_image_url?: string | null;
          status?: "draft" | "published" | "archived" | "flagged";
          moderation_status?: "approved" | "pending_review" | "hidden" | "removed";
          moderation_reason?: string | null;
          moderated_by?: string | null;
          moderated_at?: string | null;
          price?: number;
          currency?: string;
          external_url?: string | null;
          youtube_url?: string | null;
          license?: string | null;
          is_open_source?: boolean;
          platforms?: string[];
          supported_versions?: string[];
          dependencies?: string[];
          popularity_score?: number;
          view_count?: number;
          download_count?: number;
          favorite_count?: number;
          featured?: boolean;
          deleted_at?: string | null;
          updated_at?: string;
        };
      };
      listing_versions: {
        Row: {
          id: string;
          listing_id: string;
          version_number: string;
          changelog: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          version_number: string;
          changelog?: string | null;
          created_at?: string;
        };
        Update: {
          version_number?: string;
          changelog?: string | null;
        };
      };
      listing_files: {
        Row: {
          id: string;
          listing_id: string;
          version_id: string | null;
          file_name: string;
          file_path: string;
          file_size: number;
          file_type: string;
          download_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          version_id?: string | null;
          file_name: string;
          file_path: string;
          file_size: number;
          file_type: string;
          download_count?: number;
          created_at?: string;
        };
        Update: {
          file_name?: string;
          file_path?: string;
          file_size?: number;
          file_type?: string;
          download_count?: number;
        };
      };
      listing_images: {
        Row: {
          id: string;
          listing_id: string;
          image_path: string;
          alt_text: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          image_path: string;
          alt_text?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          image_path?: string;
          alt_text?: string | null;
          sort_order?: number;
        };
      };
      tags: {
        Row: { id: string; name: string; slug: string; created_at: string };
        Insert: { id?: string; name: string; slug: string; created_at?: string };
        Update: { name?: string; slug?: string };
      };
      listing_tags: {
        Row: { listing_id: string; tag_id: string };
        Insert: { listing_id: string; tag_id: string };
        Update: Record<string, never>;
      };
      comments: {
        Row: {
          id: string;
          listing_id: string;
          author_id: string;
          parent_id: string | null;
          body: string;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          author_id: string;
          parent_id?: string | null;
          body: string;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          body?: string;
          deleted_at?: string | null;
          updated_at?: string;
        };
      };
      favorites: {
        Row: {
          user_id: string;
          listing_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          listing_id: string;
          created_at?: string;
        };
        Update: Record<string, never>;
      };
      downloads: {
        Row: {
          id: string;
          listing_id: string;
          file_id: string | null;
          user_id: string | null;
          ip_hash: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          file_id?: string | null;
          user_id?: string | null;
          ip_hash?: string | null;
          created_at?: string;
        };
        Update: Record<string, never>;
      };
      reviews: {
        Row: {
          id: string;
          listing_id: string;
          author_id: string;
          rating: number;
          body: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          author_id: string;
          rating: number;
          body?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          rating?: number;
          body?: string | null;
          deleted_at?: string | null;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          sender_id: string;
          recipient_id: string;
          body: string;
          read_at: string | null;
          deleted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          sender_id: string;
          recipient_id: string;
          body: string;
          read_at?: string | null;
          deleted_at?: string | null;
          created_at?: string;
        };
        Update: {
          read_at?: string | null;
          deleted_at?: string | null;
        };
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          target_type: "listing" | "comment" | "profile";
          target_id: string;
          reason: string;
          status: "pending" | "reviewed" | "dismissed";
          created_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          target_type: "listing" | "comment" | "profile";
          target_id: string;
          reason: string;
          status?: "pending" | "reviewed" | "dismissed";
          created_at?: string;
        };
        Update: { status?: "pending" | "reviewed" | "dismissed" };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          body: string | null;
          link: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          body?: string | null;
          link?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: { read_at?: string | null };
      };
      follows: {
        Row: {
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: {
          follower_id: string;
          following_id: string;
          created_at?: string;
        };
        Update: Record<string, never>;
      };
      credit_wallets: {
        Row: {
          id: string;
          user_id: string;
          balance: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          balance?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: { balance?: number; updated_at?: string };
      };
      credit_transactions: {
        Row: {
          id: string;
          user_id: string;
          wallet_id: string;
          type: 'daily_reward' | 'download_cost' | 'translation_cost' | 'admin_adjust' | 'refund';
          amount: number;
          balance_before: number;
          balance_after: number;
          ref_type: string | null;
          ref_id: string | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          wallet_id: string;
          type: 'daily_reward' | 'download_cost' | 'translation_cost' | 'admin_adjust' | 'refund';
          amount: number;
          balance_before: number;
          balance_after: number;
          ref_type?: string | null;
          ref_id?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Update: Record<string, never>;
      };
      daily_checkins: {
        Row: {
          id: string;
          user_id: string;
          checkin_date: string;
          reward_amount: number;
          streak: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          checkin_date?: string;
          reward_amount?: number;
          streak?: number;
          created_at?: string;
        };
        Update: Record<string, never>;
      };
      app_settings: {
        Row: {
          id: string;
          key: string;
          value: Json;
          value_type: "string" | "number" | "boolean" | "json";
          description: string | null;
          category: "rewards" | "economy" | "translation" | "moderation" | "general";
          created_at: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          key: string;
          value: Json;
          value_type: "string" | "number" | "boolean" | "json";
          description?: string | null;
          category?: "rewards" | "economy" | "translation" | "moderation" | "general";
          created_at?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          value?: Json;
          updated_by?: string | null;
          updated_at?: string;
        };
      };
      admin_audit_logs: {
        Row: {
          id: string;
          admin_user_id: string;
          action_type: "credit_adjust" | "refund" | "user_ban" | "user_unban" | "user_suspend" | "user_unsuspend" | "role_change" | "listing_hide" | "listing_unhide" | "listing_delete" | "listing_restore" | "settings_change" | "report_dismiss" | "report_action";
          target_type: "user" | "listing" | "comment" | "settings" | "report";
          target_id: string | null;
          target_name: string | null;
          note: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_user_id: string;
          action_type: "credit_adjust" | "refund" | "user_ban" | "user_unban" | "user_suspend" | "user_unsuspend" | "role_change" | "listing_hide" | "listing_unhide" | "listing_delete" | "listing_restore" | "settings_change" | "report_dismiss" | "report_action";
          target_type: "user" | "listing" | "comment" | "settings" | "report";
          target_id?: string | null;
          target_name?: string | null;
          note?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: Record<string, never>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      increment_view_count: {
        Args: { listing_id: string };
        Returns: void;
      };
      increment_download_count: {
        Args: { listing_id: string; file_id: string };
        Returns: void;
      };
      adjust_credits: {
        Args: {
          p_user_id: string;
          p_amount: number;
          p_type: string;
          p_note?: string | null;
          p_ref_type?: string | null;
          p_ref_id?: string | null;
          p_admin_id?: string | null;
        };
        Returns: Json;
      };
      claim_daily_reward: {
        Args: { p_user_id: string };
        Returns: Json;
      };
      get_setting: {
        Args: { p_key: string };
        Returns: Json;
      };
      get_all_settings: {
        Args: { p_category?: string | null };
        Returns: Record<string, unknown>;
      };
    };
    Enums: Record<string, never>;
  };
};
