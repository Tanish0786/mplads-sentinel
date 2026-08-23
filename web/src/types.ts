export type Severity = "high" | "medium" | "low";

export interface Summary {
  generated_at: string;
  source: {
    name: string;
    url: string;
    record_count: number;
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
}
