import { Injectable } from "@nestjs/common";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/config/env";

@Injectable()
export class SupabaseService {
	readonly admin: SupabaseClient;

	constructor() {
		this.admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
			auth: {
				autoRefreshToken: false,
				persistSession: false,
			},
		});
	}
}
