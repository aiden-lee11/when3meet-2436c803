import React, { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

type Event = Database["public"]["Tables"]["events"]["Row"];
type Availability = Database["public"]["Tables"]["availability"]["Row"];
type AvailabilityStatus = "unavailable" | "works" | "preferred";

interface AvailabilityGridProps {
  event: Event;
  participantId: string;
  availability: Availability[];
}

const AvailabilityGrid = ({ event, participantId, availability }: AvailabilityGridProps) => {
  const [userAvailability, setUserAvailability] = useState<Map<string, AvailabilityStatus>>(new Map());
  const [isDragging, setIsDragging] = useState(false);
  const [dragStatus, setDragStatus] = useState<AvailabilityStatus>("works");
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const participantAvail = availability.filter(a => a.participant_id === participantId);
    const map = new Map<string, AvailabilityStatus>();
    participantAvail.forEach(a => {
      map.set(`${a.date}-${a.time}`, a.status as AvailabilityStatus);
    });
    setUserAvailability(map);
  }, [availability, participantId]);

  const generateTimeSlots = () => {
    const slots: string[] = [];
    const start = new Date(`2000-01-01T${event.start_time}`);
    const end = new Date(`2000-01-01T${event.end_time}`);

    while (start < end) {
      // Use HH:MM:SS consistently to match Supabase time serialization
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

  const getSlotKey = (date: string, time: string) => `${date}-${time}`;

  const cycleStatus = (current: AvailabilityStatus | undefined): AvailabilityStatus => {
    if (!current || current === "unavailable") return "works";
    if (current === "works") return "preferred";
    return "unavailable";
  };

  const handleSlotUpdate = async (date: string, time: string, status: AvailabilityStatus) => {
    const key = getSlotKey(date, time);
    const newMap = new Map(userAvailability);
    newMap.set(key, status);
    setUserAvailability(newMap);

    try {
      // Use upsert to avoid race conditions and 409 conflicts on unique constraint
      await supabase
        .from("availability")
        .upsert(
          {
            participant_id: participantId,
            event_id: event.id,
            date,
            time,
            status,
          },
          { onConflict: "participant_id,date,time" }
        );
    } catch (error) {
      console.error("Error updating availability:", error);
      toast.error("Failed to update availability");
    }
  };

  const handleMouseDown = (date: string, time: string) => {
    const key = getSlotKey(date, time);
    const currentStatus = userAvailability.get(key);
    const newStatus = cycleStatus(currentStatus);
    setDragStatus(newStatus);
    setIsDragging(true);
    handleSlotUpdate(date, time, newStatus);
  };

  const handleMouseEnter = (date: string, time: string) => {
    if (isDragging) {
      handleSlotUpdate(date, time, dragStatus);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, []);

  const getSlotColor = (status: AvailabilityStatus | undefined) => {
    if (!status || status === "unavailable") return "bg-unavailable hover:bg-muted";
    if (status === "works") return "bg-works/30 hover:bg-works/40 border-works";
    return "bg-preferred/30 hover:bg-preferred/40 border-preferred";
  };

  return (
    <div className="bg-card rounded-xl p-6 mb-6 border border-border shadow-lg">
      <div className="mb-4 flex items-center gap-4 flex-wrap">
        <h2 className="text-xl font-semibold">Select Your Availability</h2>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-unavailable border border-border"></div>
            <span>Unavailable</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-works/30 border border-works"></div>
            <span>Works for me</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-preferred/30 border border-preferred"></div>
            <span>Preferred</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div ref={gridRef} className="inline-block min-w-full">
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
                  const key = getSlotKey(date, time);
                  const status = userAvailability.get(key);
                  return (
                    <div
                      key={key}
                      className={cn(
                        "bg-card p-2 cursor-pointer select-none transition-colors border",
                        getSlotColor(status)
                      )}
                      onMouseDown={() => handleMouseDown(date, time)}
                      onMouseEnter={() => handleMouseEnter(date, time)}
                    />
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvailabilityGrid;
