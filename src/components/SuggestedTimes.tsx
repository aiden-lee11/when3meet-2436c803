import { Database } from "@/integrations/supabase/types";
import { Badge } from "@/components/ui/badge";
import { Users, Star } from "lucide-react";

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
}

const SuggestedTimes = ({ event, participants, availability }: SuggestedTimesProps) => {
  const generateTimeSlots = () => {
    const slots: string[] = [];
    const start = new Date(`2000-01-01T${event.start_time}`);
    const end = new Date(`2000-01-01T${event.end_time}`);
    
    while (start < end) {
      slots.push(start.toTimeString().slice(0, 5));
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

  const calculateSuggestions = (): TimeSlotSuggestion[] => {
    const timeSlots = generateTimeSlots();
    const dates = generateDates();
    const suggestions: TimeSlotSuggestion[] = [];

    dates.forEach(date => {
      timeSlots.forEach(time => {
        const slotAvailability = availability.filter(
          a => a.date === date && a.time === time
        );

        const preferredCount = slotAvailability.filter(a => a.status === "preferred").length;
        const worksCount = slotAvailability.filter(a => a.status === "works").length;
        const availableCount = preferredCount + worksCount;
        const percentage = participants.length > 0 
          ? (availableCount / participants.length) * 100 
          : 0;

        if (availableCount > 0) {
          suggestions.push({
            date,
            time,
            availableCount,
            preferredCount,
            worksCount,
            percentage,
          });
        }
      });
    });

    return suggestions.sort((a, b) => {
      if (b.preferredCount !== a.preferredCount) {
        return b.preferredCount - a.preferredCount;
      }
      return b.availableCount - a.availableCount;
    }).slice(0, 5);
  };

  const suggestions = calculateSuggestions();

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="bg-card rounded-xl p-6 border border-border shadow-lg">
      <h2 className="text-xl font-semibold mb-4">Suggested Times</h2>
      <div className="space-y-3">
        {suggestions.map((suggestion, index) => (
          <div
            key={`${suggestion.date}-${suggestion.time}`}
            className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 border border-border hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-4">
              {index === 0 && (
                <Star className="w-5 h-5 text-accent fill-accent" />
              )}
              <div>
                <div className="font-semibold">
                  {new Date(suggestion.date).toLocaleDateString('en-US', { 
                    weekday: 'short',
                    month: 'short', 
                    day: 'numeric' 
                  })} at {suggestion.time}
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
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SuggestedTimes;
