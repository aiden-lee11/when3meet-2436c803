import React, { useState, useEffect } from "react";
import { Database } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Event = Database["public"]["Tables"]["events"]["Row"];
type Availability = Database["public"]["Tables"]["availability"]["Row"];
type Participant = Database["public"]["Tables"]["participants"]["Row"];

interface HeatmapGridProps {
  event: Event;
  availability: Availability[];
  participants: Participant[];
}

interface HeatmapData {
  works_participants: Participant[];
  preferred_participants: Participant[];
}

const HeatmapGrid = ({ event, availability, participants }: HeatmapGridProps) => {
  const [heatmapData, setHeatmapData] = useState<Map<string, HeatmapData>>(new Map());
  const totalParticipants = participants.length;

  const generateTimeSlots = () => {
    const slots: string[] = [];
    const start = new Date(`2000-01-01T${event.start_time}`);
    const end = new Date(`2000-01-01T${event.end_time}`);

    while (start < end) {
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

  const timeSlots = generateTimeSlots();
  const dates = generateDates();

  useEffect(() => {
    const newHeatmapData = new Map<string, HeatmapData>();
    const participantMap = new Map(participants.map(p => [p.id, p]));

    dates.forEach(date => {
      timeSlots.forEach(time => {
        const key = `${date}-${time}`;
        const slotAvailability = availability.filter(a => a.date === date && a.time === time);
        
        const works_participants: Participant[] = [];
        const preferred_participants: Participant[] = [];

        slotAvailability.forEach(a => {
          const participant = participantMap.get(a.participant_id);
          if (participant) {
            if (a.status === 'works') {
              works_participants.push(participant);
            } else if (a.status === 'preferred') {
              preferred_participants.push(participant);
            }
          }
        });

        if (works_participants.length > 0 || preferred_participants.length > 0) {
          newHeatmapData.set(key, { works_participants, preferred_participants });
        }
      });
    });

    setHeatmapData(newHeatmapData);
  }, [availability, participants, dates, timeSlots]);

  const getSlotClasses = (data: HeatmapData | undefined): string => {
    if (!data || totalParticipants === 0) {
      return "bg-unavailable";
    }

    const works_count = data.works_participants.length;
    const preferred_count = data.preferred_participants.length;
    
    const score = works_count * 1 + preferred_count * 2;
    const maxScore = totalParticipants * 2;
    const scoreRatio = maxScore > 0 ? score / maxScore : 0;

    if (scoreRatio === 0) return "heatmap-0";
    if (scoreRatio <= 0.2) return "heatmap-20";
    if (scoreRatio <= 0.4) return "heatmap-40";
    if (scoreRatio <= 0.6) return "heatmap-60";
    if (scoreRatio <= 0.8) return "heatmap-80";
    return "heatmap-100";
  };

  return (
    <TooltipProvider>
      <div className="bg-card rounded-xl p-6 mb-6 border border-border shadow-lg">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Group Availability Heatmap</h2>
          <p className="text-sm text-muted-foreground">
            Deeper green means more people are available and prefer that time. Hover for details.
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
                    const key = `${date}-${time}`;
                    const data = heatmapData.get(key);
                    return (
                      <Tooltip key={key}>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "h-10 p-2 select-none transition-colors",
                              getSlotClasses(data)
                            )}
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          {data ? (
                            <div className="text-sm">
                              {data.preferred_participants.length > 0 && (
                                <div className="mb-2">
                                  <p className="font-bold text-preferred">Preferred:</p>
                                  <ul>
                                    {data.preferred_participants.map(p => <li key={p.id}>{p.name}</li>)}
                                  </ul>
                                </div>
                              )}
                              {data.works_participants.length > 0 && (
                                <div>
                                  <p className="font-bold text-works">Works for me:</p>
                                  <ul>
                                    {data.works_participants.map(p => <li key={p.id}>{p.name}</li>)}
                                  </ul>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p>No one available</p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default HeatmapGrid;