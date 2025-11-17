import React from "react";
import { Database } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

type Event = Database["public"]["Tables"]["events"]["Row"];
type Participant = Database["public"]["Tables"]["participants"]["Row"];
type Availability = Database["public"]["Tables"]["availability"]["Row"];

interface HeatmapGridProps {
  event: Event;
  participants: Participant[];
  availability: Availability[];
}

const HeatmapGrid = ({ event, participants, availability }: HeatmapGridProps) => {
  const generateTimeSlots = () => {
    const slots: string[] = [];
    const start = new Date(`2000-01-01T${event.start_time}`);
    const end = new Date(`2000-01-01T${event.end_time}`);

    while (start < end) {
      const hhmmss = start.toTimeString().slice(0, 8);
      slots.push(hhmmss);
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

  const timeSlots = generateTimeSlots();
  const dates = generateDates();
  const totalParticipants = participants.length;

  const getSlotAvailability = (date: string, time: string) => {
    const slotAvailability = availability.filter(
      a => a.date === date && a.time === time && (a.status === "works" || a.status === "preferred")
    );
    return slotAvailability.length;
  };

  const getHeatmapColor = (availableCount: number) => {
    if (totalParticipants === 0 || availableCount === 0) {
      return "bg-muted/50";
    }
    const percentage = availableCount / totalParticipants;
    if (percentage < 0.2) return "bg-green-200";
    if (percentage < 0.4) return "bg-green-300";
    if (percentage < 0.6) return "bg-green-400";
    if (percentage < 0.8) return "bg-green-500";
    return "bg-green-600";
  };

  return (
    <Card className="bg-card rounded-xl p-6 border border-border shadow-lg">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Group Availability Heatmap</h2>
        <p className="text-sm text-muted-foreground">
          Darker shades indicate more people are available.
        </p>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="grid gap-px bg-border" style={{ gridTemplateColumns: `100px repeat(${dates.length}, minmax(80px, 1fr))` }}>
            <div className="bg-card p-2 font-semibold text-sm"></div>
            {dates.map(date => (
              <div key={date} className="bg-card p-2 font-semibold text-center text-sm">
                {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
            ))}
            
            {timeSlots.map((time) => (
              <React.Fragment key={time}>
                <div className="bg-card p-2 text-sm font-medium">
                  {time.slice(0, 5)}
                </div>
                {dates.map((date) => {
                  const availableCount = getSlotAvailability(date, time);
                  return (
                    <div
                      key={`${date}-${time}`}
                      className={cn(
                        "p-2 transition-colors border",
                        getHeatmapColor(availableCount)
                      )}
                    />
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default HeatmapGrid;
