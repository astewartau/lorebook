
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "binder_cards": {
                  Row: {
                    "binder_id": string,"card_id": number,"position": number,"quantity": number
                  }
                  ComputedFields: never
                  Insert: {
                    "binder_id": string,"card_id": number,"position": number,"quantity": number
                  }
                  Update: {
                    "binder_id"?: string,"card_id"?: number,"position"?: number,"quantity"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "binder_cards_binder_id_fkey"
      columns: ["binder_id"]
isOneToOne: false
      referencedRelation: "binders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "binder_cards_card_id_fkey"
      columns: ["card_id"]
isOneToOne: false
      referencedRelation: "cards"
      referencedColumns: ["id"]
    }
                  ]
                },"binders": {
                  Row: {
                    "created_at": string,"description": string | null,"id": string,"is_public": boolean,"kind": string,"name": string,"owner_id": string,"set_code": string | null,"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"is_public"?: boolean,"kind": string,"name": string,"owner_id": string,"set_code"?: string | null,"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"is_public"?: boolean,"kind"?: string,"name"?: string,"owner_id"?: string,"set_code"?: string | null,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "binders_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"cards": {
                  Row: {
                    "full_name": string,"id": number,"inks": (string)[],"number": number | null,"set_code": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "full_name": string,"id": number,"inks"?: (string)[],"number"?: number | null,"set_code": string,"updated_at"?: string
                  }
                  Update: {
                    "full_name"?: string,"id"?: number,"inks"?: (string)[],"number"?: number | null,"set_code"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"collection_cards": {
                  Row: {
                    "card_id": number,"collection_id": string,"foil": number,"normal": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "card_id": number,"collection_id": string,"foil"?: number,"normal"?: number,"updated_at"?: string
                  }
                  Update: {
                    "card_id"?: number,"collection_id"?: string,"foil"?: number,"normal"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "collection_cards_card_id_fkey"
      columns: ["card_id"]
isOneToOne: false
      referencedRelation: "cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "collection_cards_collection_id_fkey"
      columns: ["collection_id"]
isOneToOne: false
      referencedRelation: "collections"
      referencedColumns: ["id"]
    }
                  ]
                },"collection_invites": {
                  Row: {
                    "collection_id": string,"created_at": string,"id": string,"invitee_id": string,"inviter_id": string,"responded_at": string | null,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "collection_id": string,"created_at"?: string,"id"?: string,"invitee_id": string,"inviter_id": string,"responded_at"?: string | null,"status"?: string
                  }
                  Update: {
                    "collection_id"?: string,"created_at"?: string,"id"?: string,"invitee_id"?: string,"inviter_id"?: string,"responded_at"?: string | null,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "collection_invites_collection_id_fkey"
      columns: ["collection_id"]
isOneToOne: false
      referencedRelation: "collections"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "collection_invites_invitee_id_fkey"
      columns: ["invitee_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "collection_invites_inviter_id_fkey"
      columns: ["inviter_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"collection_members": {
                  Row: {
                    "collection_id": string,"joined_at": string,"role": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "collection_id": string,"joined_at"?: string,"role": string,"user_id": string
                  }
                  Update: {
                    "collection_id"?: string,"joined_at"?: string,"role"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "collection_members_collection_id_fkey"
      columns: ["collection_id"]
isOneToOne: false
      referencedRelation: "collections"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "collection_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"collections": {
                  Row: {
                    "created_at": string,"id": string,"invite_code": string | null,"name": string,"owner_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"invite_code"?: string | null,"name"?: string,"owner_id": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"invite_code"?: string | null,"name"?: string,"owner_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "collections_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"deck_cards": {
                  Row: {
                    "card_id": number,"deck_id": string,"quantity": number
                  }
                  ComputedFields: never
                  Insert: {
                    "card_id": number,"deck_id": string,"quantity": number
                  }
                  Update: {
                    "card_id"?: number,"deck_id"?: string,"quantity"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "deck_cards_card_id_fkey"
      columns: ["card_id"]
isOneToOne: false
      referencedRelation: "cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "deck_cards_deck_id_fkey"
      columns: ["deck_id"]
isOneToOne: false
      referencedRelation: "deck_details"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "deck_cards_deck_id_fkey"
      columns: ["deck_id"]
isOneToOne: false
      referencedRelation: "decks"
      referencedColumns: ["id"]
    }
                  ]
                },"deck_comments": {
                  Row: {
                    "author_id": string,"body": string,"created_at": string,"deck_id": string,"edited_at": string | null,"id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id": string,"body": string,"created_at"?: string,"deck_id": string,"edited_at"?: string | null,"id"?: string
                  }
                  Update: {
                    "author_id"?: string,"body"?: string,"created_at"?: string,"deck_id"?: string,"edited_at"?: string | null,"id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "deck_comments_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "deck_comments_deck_id_fkey"
      columns: ["deck_id"]
isOneToOne: false
      referencedRelation: "deck_details"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "deck_comments_deck_id_fkey"
      columns: ["deck_id"]
isOneToOne: false
      referencedRelation: "decks"
      referencedColumns: ["id"]
    }
                  ]
                },"decks": {
                  Row: {
                    "avatar": Json | null,"created_at": string,"description": string | null,"guide": string | null,"id": string,"is_public": boolean,"name": string,"owner_id": string,"tags": (string)[],"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar"?: Json | null,"created_at"?: string,"description"?: string | null,"guide"?: string | null,"id"?: string,"is_public"?: boolean,"name": string,"owner_id": string,"tags"?: (string)[],"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "avatar"?: Json | null,"created_at"?: string,"description"?: string | null,"guide"?: string | null,"id"?: string,"is_public"?: boolean,"name"?: string,"owner_id"?: string,"tags"?: (string)[],"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "decks_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "created_at": string,"data": NonNullable<Json>,"id": string,"kind": string,"read_at": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"data"?: NonNullable<Json>,"id"?: string,"kind": string,"read_at"?: string | null,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"data"?: NonNullable<Json>,"id"?: string,"kind"?: string,"read_at"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "active_collection_id": string | null,"avatar_card_id": number | null,"avatar_crop": Json | null,"bio": string | null,"created_at": string,"display_name": string,"full_name": string | null,"is_public": boolean,"location": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active_collection_id"?: string | null,"avatar_card_id"?: number | null,"avatar_crop"?: Json | null,"bio"?: string | null,"created_at"?: string,"display_name": string,"full_name"?: string | null,"is_public"?: boolean,"location"?: string | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "active_collection_id"?: string | null,"avatar_card_id"?: number | null,"avatar_crop"?: Json | null,"bio"?: string | null,"created_at"?: string,"display_name"?: string,"full_name"?: string | null,"is_public"?: boolean,"location"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_active_collection_fk"
      columns: ["active_collection_id"]
isOneToOne: false
      referencedRelation: "collections"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "profiles_avatar_card_id_fkey"
      columns: ["avatar_card_id"]
isOneToOne: false
      referencedRelation: "cards"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "deck_details": {
                  Row: {
                    "avatar": Json | null,"card_count": number | null,"cards": Json | null,"created_at": string,"description": string | null,"guide": string | null,"id": string,"inks": (string)[] | null,"is_public": boolean,"name": string,"owner_id": string,"owner_name": string | null,"tags": (string)[],"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "decks_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                }
          }
          Functions: {
            "adjust_collection_cards":
{ Args: { "p_changes": Json,"p_collection": string }; Returns: {
              "card_id": number,"foil": number,"normal": number
            }[]
                           },
"cancel_invite":
{ Args: { "p_invite": string }; Returns: undefined
                           },
"create_deck":
{ Args: { "p_avatar"?: Json,"p_cards"?: Json,"p_description"?: string,"p_name": string,"p_tags"?: (string)[] }; Returns: string
                           },
"disable_invite_code":
{ Args: { "p_collection": string }; Returns: undefined
                           },
"get_binder_view":
{ Args: { "p_binder": string }; Returns: Json
                           },
"invite_to_collection":
{ Args: { "p_collection": string,"p_invitee": string }; Returns: string
                           },
"join_collection":
{ Args: { "p_code": string,"p_merge"?: boolean }; Returns: string
                           },
"leave_collection":
{ Args: { "p_collection": string }; Returns: undefined
                           },
"remove_collection_member":
{ Args: { "p_collection": string,"p_user": string }; Returns: undefined
                           },
"replace_collection_cards":
{ Args: { "p_cards": Json,"p_collection": string }; Returns: number
                           },
"respond_to_invite":
{ Args: { "p_accept": boolean,"p_invite": string,"p_merge"?: boolean }; Returns: undefined
                           },
"rotate_invite_code":
{ Args: { "p_collection": string }; Returns: string
                           },
"save_binder_cards":
{ Args: { "p_binder": string,"p_cards": Json,"p_expected_version"?: number }; Returns: number
                           },
"save_deck_cards":
{ Args: { "p_cards": Json,"p_deck": string,"p_expected_version"?: number }; Returns: number
                           },
"search_public_decks":
{ Args: { "p_inks"?: (string)[],"p_limit"?: number,"p_offset"?: number,"p_owner"?: string,"p_search"?: string,"p_tags"?: (string)[] }; Returns: {
              "avatar": Json | null,
"card_count": number | null,
"cards": Json | null,
"created_at": string,
"description": string | null,
"guide": string | null,
"id": string,
"inks": (string)[] | null,
"is_public": boolean,
"name": string,
"owner_id": string,
"owner_name": string | null,
"tags": (string)[],
"updated_at": string,
"version": number
            }[]
                          SetofOptions: {
        from: "*"
        to: "deck_details"
        isOneToOne: false
        isSetofReturn: true
      } },
"set_active_collection":
{ Args: { "p_collection": string }; Returns: undefined
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
