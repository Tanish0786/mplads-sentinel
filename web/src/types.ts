export type Severity = "high" | "medium" | "low";

export interface Flag {
  flag_type: string;
  flag_label: string;
  severity: Severity;
  explanation: string;
}

export interface Summary {
  generated_at: string;
  source: {
    name: string;
    url: string;
    record_count: number;
  };
  thresholds: {
    noise_pct: number;
    medium_pct: number;
    high_pct: number;
  };
  national_tiles: {
    works_recommended: { count: number; amount_inr: number; display: string };
    works_sanctioned: { count: number; amount_inr: number; display: string };
    works_completed: { count: number; amount_inr: number; display: string };
    total_expenditure: { amount_inr: number; display: string };
    amount_consented_calamity: { count: number; amount_inr: number; display: string };
    tenure_label: string;
  };
  headline: {
    flagged_amount_inr: number;
    flagged_amount_display: string;
    flagged_count: number;
    total_mps: number;
    total_allocated_inr: number;
    total_allocated_display: string;
  };
  severity_counts: Record<Severity, number>;
  new_since_last_run: number;
}

export interface FlaggedCase {
  id: string;
  mp_name: string;
  state: string;
  constituency: string;
  house: string;
  allocated_amt: number;
  cohort_baseline: number;
  deviation_pct: number;
  severity: Severity;
  flag_type: string;
  flag_label: string;
  explanation: string;
  tenure_start: string;
  tenure_end: string;
  is_new: boolean;
}

export interface MPRecord {
  id: string;
  mp_name: string;
  state: string;
  constituency: string;
  house: string;
  allocated_amt: number;
  cohort_baseline: number;
  deviation_pct: number;
  cohort_explanation: string;
  tenure_start: string;
  tenure_end: string;
  severity: Severity | null;
  flags: Flag[];
}
