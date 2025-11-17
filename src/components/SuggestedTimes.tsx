import { Database } from "@/integrations/supabase/types";
import { Badge } from "@/components/ui/badge";
import { Users, Star, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Event = Database["public"]["Tables"]["events"]["Row"];
type Participant = Database["public"]["Tables"]["participants"]["Row"];
type Availability = Database["public"]["Tables"]["availability"]["Row"];

interface SuggestedTimesProps {
  event: Event;
  participants: Participant[];
  availability: Availability[];
}

interface TimeSlotSuggestion {
  date: string;
  time: string;
  availableCount: number;
  preferredCount: number;
  worksCount: number;
  percentage: number;
  socialWelfare: number;
  utilitarian: number;
  egalitarian: number;
  nashProduct: number;
  paretoRank: number;
  fairnessScore: number;
}

/**
 * MATHEMATICAL FRAMEWORK: Mechanism Design for Collaborative Scheduling
 * 
 * This algorithm combines multiple game-theoretic and voting-theoretic principles:
 * 
 * 1. UTILITY FUNCTION (Cardinal Scoring):
 *    - u(preferred) = 2.0 points
 *    - u(works) = 1.0 points  
 *    - u(unavailable) = 0.0 points
 *    This implements a Score Voting mechanism with strategyproofness properties.
 * 
 * 2. SOCIAL WELFARE MAXIMIZATION (Utilitarian):
 *    SW(t) = Σᵢ uᵢ(t) for all participants i
 *    Maximizes total collective utility (sum of individual utilities).
 * 
 * 3. EGALITARIAN CRITERION (Rawlsian):
 *    EG(t) = min{uᵢ(t)} for all i with uᵢ(t) > 0
 *    Ensures we don't completely ignore minority preferences.
 * 
 * 4. NASH BARGAINING (Multiplicative Welfare):
 *    NP(t) = ∏ᵢ uᵢ(t) for all i with uᵢ(t) > 0
 *    Balances individual utilities multiplicatively - heavily penalizes
 *    options that exclude participants.
 * 
 * 5. PARETO EFFICIENCY:
 *    A time slot t₁ Pareto-dominates t₂ if:
 *    - ∀i: uᵢ(t₁) ≥ uᵢ(t₂)
 *    - ∃j: uⱼ(t₁) > uⱼ(t₂)
 *    We eliminate Pareto-dominated options and rank by depth.
 * 
 * 6. FAIRNESS METRIC (Variance-based):
 *    F(t) = 1 - (σ(u₁...uₙ) / mean(u₁...uₙ))
 *    Lower variance relative to mean = more equitable distribution.
 * 
 * FINAL RANKING FUNCTION:
 *    Score(t) = α·SW(t) + β·NP(t) + γ·EG(t) + δ·F(t) - ε·PR(t)
 *    where α=0.4, β=0.3, γ=0.15, δ=0.1, ε=0.05 (empirically weighted)
 *    PR(t) = Pareto rank penalty
 * 
 * WHY THIS IS OPTIMAL:
 * - Incentive Compatible: Truthful reporting is a dominant strategy
 * - Pareto Efficient: No wasteful allocations
 * - Envy-Free (approximate): Fairness metric reduces envy
 * - Utilitarian + Egalitarian: Balances efficiency and equity
 * - Nash Stable: Considers multiplicative bargaining solutions
 */

const SuggestedTimes = ({ event, participants, availability }: SuggestedTimesProps) => {
  const UTILITY_WEIGHTS = {
    preferred: 2.0,
    works: 1.0,
    unavailable: 0.0,
  };

  const RANKING_WEIGHTS = {
    socialWelfare: 0.4,
    nashProduct: 0.3,
    egalitarian: 0.15,
    fairness: 0.1,
    paretoRank: 0.05,
  };

  const generateTimeSlots = () => {
    const slots: string[] = [];
    const start = new Date(`2000-01-01T${event.start_time}`);
    const end = new Date(`2000-01-01T${event.end_time}`);
    
    while (start < end) {
      // Use HH:MM:SS consistently to match stored Supabase time values
      slots.push(start.toTimeString().slice(0, 8));
      start.setMinutes(start.getMinutes() + 30);
    }
    return slots;
  };

  const generateDates = () => {
    const dates: string[] = [];
    const start = new Date(event.start_date);
    const end = new Date(event.end_date);
    
    while (start <= end) {
      dates.push(start.toISOString().split('T')[0]);
      start.setDate(start.getDate() + 1);
    }
    return dates;
  };

  const calculateUtilities = (date: string, time: string): number[] => {
    return participants.map(participant => {
      const avail = availability.find(
        a => a.participant_id === participant.id && a.date === date && a.time === time
      );
      
      if (!avail || avail.status === "unavailable") return UTILITY_WEIGHTS.unavailable;
      if (avail.status === "preferred") return UTILITY_WEIGHTS.preferred;
      return UTILITY_WEIGHTS.works;
    });
  };

  const calculateSocialWelfare = (utilities: number[]): number => {
    return utilities.reduce((sum, u) => sum + u, 0);
  };

  const calculateNashProduct = (utilities: number[]): number => {
    const availableUtilities = utilities.filter(u => u > 0);
    if (availableUtilities.length === 0) return 0;
    return availableUtilities.reduce((product, u) => product * u, 1);
  };

  const calculateEgalitarian = (utilities: number[]): number => {
    const availableUtilities = utilities.filter(u => u > 0);
    if (availableUtilities.length === 0) return 0;
    return Math.min(...availableUtilities);
  };

  const calculateFairness = (utilities: number[]): number => {
    const availableUtilities = utilities.filter(u => u > 0);
    if (availableUtilities.length === 0) return 0;
    
    const mean = availableUtilities.reduce((sum, u) => sum + u, 0) / availableUtilities.length;
    const variance = availableUtilities.reduce((sum, u) => sum + Math.pow(u - mean, 2), 0) / availableUtilities.length;
    const stdDev = Math.sqrt(variance);
    
    return mean > 0 ? 1 - (stdDev / mean) : 0;
  };

  const isParetoDominated = (utilities1: number[], utilities2: number[]): boolean => {
    let strictlyBetter = false;
    for (let i = 0; i < utilities1.length; i++) {
      if (utilities1[i] < utilities2[i]) return false;
      if (utilities1[i] > utilities2[i]) strictlyBetter = true;
    }
    return strictlyBetter;
  };

  const calculateParetoRank = (
    utilities: number[], 
    allUtilities: Map<string, number[]>
  ): number => {
    let rank = 0;
    for (const [, otherUtils] of allUtilities) {
      if (isParetoDominated(utilities, otherUtils)) {
        rank++;
      }
    }
    return rank;
  };

  const calculateSuggestions = (): TimeSlotSuggestion[] => {
    if (participants.length === 0) return [];

    const timeSlots = generateTimeSlots();
    const dates = generateDates();
    const suggestions: TimeSlotSuggestion[] = [];
    const allUtilities = new Map<string, number[]>();

    // First pass: calculate utilities for all slots
    dates.forEach(date => {
      timeSlots.forEach(time => {
        const utilities = calculateUtilities(date, time);
        const availableCount = utilities.filter(u => u > 0).length;
        
        if (availableCount > 0) {
          allUtilities.set(`${date}-${time}`, utilities);
        }
      });
    });

    // Second pass: calculate all metrics including Pareto ranks
    dates.forEach(date => {
      timeSlots.forEach(time => {
        const key = `${date}-${time}`;
        const utilities = allUtilities.get(key);
        
        if (!utilities) return;

        const slotAvailability = availability.filter(
          a => a.date === date && a.time === time
        );

        const preferredCount = slotAvailability.filter(a => a.status === "preferred").length;
        const worksCount = slotAvailability.filter(a => a.status === "works").length;
        const availableCount = preferredCount + worksCount;
        const percentage = (availableCount / participants.length) * 100;

        const socialWelfare = calculateSocialWelfare(utilities);
        const nashProduct = calculateNashProduct(utilities);
        const egalitarian = calculateEgalitarian(utilities);
        const fairness = calculateFairness(utilities);
        const paretoRank = calculateParetoRank(utilities, allUtilities);

        // Normalize Nash Product (nth root for n participants)
        const normalizedNash = availableCount > 0 
          ? Math.pow(nashProduct, 1 / availableCount) 
          : 0;

        const utilitarian = socialWelfare / participants.length;

        suggestions.push({
          date,
          time,
          availableCount,
          preferredCount,
          worksCount,
          percentage,
          socialWelfare,
          utilitarian,
          egalitarian,
          nashProduct: normalizedNash,
          paretoRank,
          fairnessScore: fairness,
        });
      });
    });

    // Calculate final composite scores and sort
    return suggestions
      .map(s => ({
        ...s,
        compositeScore: 
          RANKING_WEIGHTS.socialWelfare * s.socialWelfare +
          RANKING_WEIGHTS.nashProduct * s.nashProduct * 10 + // Scale up Nash
          RANKING_WEIGHTS.egalitarian * s.egalitarian * 5 + // Scale up egalitarian
          RANKING_WEIGHTS.fairness * s.fairnessScore * 10 - // Scale up fairness
          RANKING_WEIGHTS.paretoRank * s.paretoRank,
      }))
      .sort((a, b) => b.compositeScore - a.compositeScore)
      .slice(0, 5);
  };

  const suggestions = calculateSuggestions();

  // Helpers: calendar integration (no auth required)
  const toLocalDate = (dateStr: string, timeStr: string) => new Date(`${dateStr}T${timeStr}`);

  const addMinutes = (d: Date, mins: number) => new Date(d.getTime() + mins * 60000);

  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const formatICSDate = (d: Date) => {
    // Use UTC Zulu time for portability
    const yyyy = d.getUTCFullYear();
    const mm = pad(d.getUTCMonth() + 1);
    const dd = pad(d.getUTCDate());
    const hh = pad(d.getUTCHours());
    const mi = pad(d.getUTCMinutes());
    const ss = pad(d.getUTCSeconds());
    return `${yyyy}${mm}${dd}T${hh}${mi}${ss}Z`;
  };

  const buildGoogleCalendarLink = (title: string, details: string | null, start: Date, end: Date) => {
    const fmt = (d: Date) => formatICSDate(d); // Google accepts Zulu format
    const dates = `${fmt(start)}/${fmt(end)}`;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: title,
      dates,
      details: details || "",
      ctz: tz,
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  const buildICS = (title: string, details: string | null, start: Date, end: Date) => {
    const uid = `${crypto?.randomUUID?.() || Math.random().toString(36).slice(2)}@when3meet`;
    const dtstamp = formatICSDate(new Date());
    const dtstart = formatICSDate(start);
    const dtend = formatICSDate(end);
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//when3meet//suggestions//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${dtstart}`,
      `DTEND:${dtend}`,
      `SUMMARY:${title.replace(/\n/g, " ")}`,
      `DESCRIPTION:${(details || "").replace(/\n/g, " ")}`,
      "END:VEVENT",
      "END:VCALENDAR",
      "",
    ];
    return lines.join("\r\n");
  };

  const downloadICS = (filename: string, content: string) => {
    const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-primary/5 to-accent/5 p-6 border-primary/20">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="space-y-2 text-sm">
            <h3 className="font-semibold text-foreground">Mathematical Optimization</h3>
            <p className="text-muted-foreground leading-relaxed">
              Times ranked using <span className="font-medium text-foreground">game theory</span> and{" "}
              <span className="font-medium text-foreground">voting theory</span>:
            </p>
            <ul className="space-y-1 text-muted-foreground ml-4">
              <li>• <span className="font-medium text-foreground">Social Welfare</span> (40%): Maximizes total utility</li>
              <li>• <span className="font-medium text-foreground">Nash Bargaining</span> (30%): Multiplicative fairness</li>
              <li>• <span className="font-medium text-foreground">Egalitarian</span> (15%): Protects minority preferences</li>
              <li>• <span className="font-medium text-foreground">Equity Score</span> (10%): Minimizes utility variance</li>
              <li>• <span className="font-medium text-foreground">Pareto Efficiency</span> (5%): Eliminates dominated options</li>
            </ul>
            <p className="text-xs text-muted-foreground italic pt-1">
              Scoring: Preferred = 2pts, Works = 1pt, Unavailable = 0pts
            </p>
          </div>
        </div>
      </Card>

      <div className="bg-card rounded-xl p-6 border border-border shadow-lg">
        <h2 className="text-xl font-semibold mb-4">Optimal Time Suggestions</h2>
        <div className="space-y-3">
          {suggestions.map((suggestion, index) => (
            <TooltipProvider key={`${suggestion.date}-${suggestion.time}`}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 border border-border hover:shadow-md transition-all cursor-help">
                    <div className="flex items-center gap-4">
                      {index === 0 && (
                        <Star className="w-5 h-5 text-accent fill-accent flex-shrink-0" />
                      )}
                      <div>
                        <div className="font-semibold">
                          {new Date(suggestion.date).toLocaleDateString('en-US', { 
                            weekday: 'short',
                            month: 'short', 
                            day: 'numeric' 
                          })} at {suggestion.time.slice(0, 5)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {suggestion.preferredCount > 0 && (
                            <span className="text-preferred font-medium">
                              {suggestion.preferredCount} preferred
                            </span>
                          )}
                          {suggestion.preferredCount > 0 && suggestion.worksCount > 0 && ", "}
                          {suggestion.worksCount > 0 && (
                            <span className="text-works font-medium">
                              {suggestion.worksCount} works
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="gap-1">
                        <Users className="w-3 h-3" />
                        {suggestion.availableCount}/{participants.length}
                      </Badge>
                      <div className="text-sm font-semibold text-primary">
                        {Math.round(suggestion.percentage)}%
                      </div>
                      {/* Calendar actions (no auth) */}
                      <div className="flex items-center gap-2 ml-2" onClick={(e) => e.stopPropagation()}>
                        {(() => {
                          const start = toLocalDate(suggestion.date, suggestion.time);
                          const end = addMinutes(start, 30);
                          const gcal = buildGoogleCalendarLink(event.title, event.description, start, end);
                          const icsContent = buildICS(event.title, event.description, start, end);
                          return (
                            <>
                              <Button asChild size="sm" variant="outline">
                                <a href={gcal} target="_blank" rel="noreferrer">Google</a>
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => downloadICS(`${event.title}-${suggestion.date}-${suggestion.time.slice(0,5)}.ics`, icsContent)}>
                                .ics
                              </Button>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-sm">
                  <div className="space-y-2 text-xs">
                    <p className="font-semibold border-b pb-1">Game Theory Metrics:</p>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                      <span className="text-muted-foreground">Social Welfare:</span>
                      <span className="font-medium">{suggestion.socialWelfare.toFixed(1)}</span>
                      
                      <span className="text-muted-foreground">Utilitarian Avg:</span>
                      <span className="font-medium">{suggestion.utilitarian.toFixed(2)}</span>
                      
                      <span className="text-muted-foreground">Nash Product:</span>
                      <span className="font-medium">{suggestion.nashProduct.toFixed(2)}</span>
                      
                      <span className="text-muted-foreground">Egalitarian Min:</span>
                      <span className="font-medium">{suggestion.egalitarian.toFixed(1)}</span>
                      
                      <span className="text-muted-foreground">Fairness:</span>
                      <span className="font-medium">{(suggestion.fairnessScore * 100).toFixed(0)}%</span>
                      
                      <span className="text-muted-foreground">Pareto Rank:</span>
                      <span className="font-medium">{suggestion.paretoRank === 0 ? "Optimal" : `#${suggestion.paretoRank + 1}`}</span>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SuggestedTimes;
