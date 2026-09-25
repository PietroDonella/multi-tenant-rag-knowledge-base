export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type OrgRole = "owner" | "admin" | "member";

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          created_by: string;
          description: string | null;
          location: string | null;
          avatar_url: string | null;
          banner_url: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          created_by?: string;
          description?: string | null;
          location?: string | null;
          avatar_url?: string | null;
          banner_url?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          created_by?: string;
          description?: string | null;
          location?: string | null;
          avatar_url?: string | null;
          banner_url?: string | null;
        };
        Relationships: [];
      };
      organization_users: {
        Row: { org_id: string; user_id: string; role: OrgRole };
        Insert: { org_id: string; user_id: string; role: OrgRole };
        Update: { org_id?: string; user_id?: string; role?: OrgRole };
        Relationships: [
          {
            foreignKeyName: "organization_users_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "organization_users_profile_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: { id: string; display_name: string | null; avatar_url: string | null };
        Insert: { id: string; display_name?: string | null; avatar_url?: string | null };
        Update: { id?: string; display_name?: string | null; avatar_url?: string | null };
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          org_id: string;
          filename: string;
          file_url: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          filename: string;
          file_url: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          filename?: string;
          file_url?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "documents_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      document_chunks: {
        Row: {
          id: string;
          document_id: string;
          org_id: string;
          content: string;
          embedding: number[] | null;
        };
        Insert: {
          id?: string;
          document_id: string;
          org_id: string;
          content: string;
          embedding?: string | number[] | null;
        };
        Update: {
          id?: string;
          document_id?: string;
          org_id?: string;
          content?: string;
          embedding?: number[] | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      add_organization_member: {
        Args: { target_org: string; member_email: string };
        Returns: undefined;
      };
      match_document_chunks: {
        Args: {
          query_embedding: string;
          match_org_id: string;
          match_count?: number;
        };
        Returns: {
          id: string;
          document_id: string;
          org_id: string;
          content: string;
          similarity: number;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Organization = Database["public"]["Tables"]["organizations"]["Row"];
export type DocumentRow = Database["public"]["Tables"]["documents"]["Row"];
export type DocumentChunk = Database["public"]["Tables"]["document_chunks"]["Row"];
export type MatchedChunk =
  Database["public"]["Functions"]["match_document_chunks"]["Returns"][number];
