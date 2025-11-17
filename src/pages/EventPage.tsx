import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Link2, ArrowLeft } from "lucide-react";
import AvailabilityGrid from "@/components/AvailabilityGrid";
import HeatmapGrid from "@/components/HeatmapGrid";
import SuggestedTimes from "@/components/SuggestedTimes";
import { Database } from "@/integrations/supabase/types";

type Event = Database["public"]["Tables"]["events"]["Row"];
type Participant = Database["public"]["Tables"]["participants"]["Row"];
type Availability = Database["public"]["Tables"]["availability"]["Row"];

const EventPage = () => {
  const { slug } = useParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [participantName, setParticipantName] = useState("");
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null);

  useEffect(() => {
    loadEvent();
  }, [slug]);

  useEffect(() => {
    if (!event) return;

    const channel = supabase
      .channel(`event-${event.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "participants",
          filter: `event_id=eq.${event.id}`,
        },
        () => {
          loadParticipants();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "availability",
          filter: `event_id=eq.${event.id}`,
        },
        () => {
          loadAvailability();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [event]);

  const loadEvent = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("slug", slug)
        .single();

      if (error) throw error;
      setEvent(data);
      loadParticipants();
      loadAvailability();
    } catch (error) {
      console.error("Error loading event:", error);
      toast.error("Event not found");
    } finally {
      setLoading(false);
    }
  };

  const loadParticipants = async () => {
    if (!event) return;
    const { data } = await supabase
      .from("participants")
      .select("*")
      .eq("event_id", event.id);
    setParticipants(data || []);
  };

  const loadAvailability = async () => {
    if (!event) return;
    const { data } = await supabase
      .from("availability")
      .select("*")
      .eq("event_id", event.id);
    setAvailability(data || []);
  };

  const handleAddParticipant = async () => {
    if (!participantName.trim() || !event) return;

    try {
      const { data, error } = await supabase
        .from("participants")
        .insert({
          event_id: event.id,
          name: participantName.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      setSelectedParticipant(data.id);
      setParticipantName("");
      toast.success("Added to event!");
    } catch (error) {
      console.error("Error adding participant:", error);
      toast.error("Failed to add participant");
    }
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied!");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading event...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Event not found</h1>
          <Button asChild>
            <a href="/">Create New Event</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" asChild className="mb-4">
            <a href="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </a>
          </Button>
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {event.title}
              </h1>
              {event.description && (
                <p className="text-muted-foreground">{event.description}</p>
              )}
            </div>
            <Button onClick={copyShareLink} variant="outline">
              <Link2 className="w-4 h-4 mr-2" />
              Share Link
            </Button>
          </div>
        </div>

        {!selectedParticipant && (
          <div className="bg-card rounded-xl p-6 mb-6 border border-border shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Add Your Name</h2>
            <div className="flex gap-3">
              <div className="flex-1">
                <Label htmlFor="name" className="sr-only">Your name</Label>
                <Input
                  id="name"
                  value={participantName}
                  onChange={(e) => setParticipantName(e.target.value)}
                  placeholder="Enter your name"
                  onKeyPress={(e) => e.key === "Enter" && handleAddParticipant()}
                />
              </div>
              <Button onClick={handleAddParticipant}>Join Event</Button>
            </div>
            {participants.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-2">Or select existing:</p>
                <div className="flex flex-wrap gap-2">
                  {participants.map((p) => (
                    <Button
                      key={p.id}
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedParticipant(p.id)}
                    >
                      {p.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {selectedParticipant && (
          <>
            <div className="mb-4 flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Editing as:</span>
              <span className="font-semibold">
                {participants.find((p) => p.id === selectedParticipant)?.name}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedParticipant(null)}
              >
                Change
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AvailabilityGrid
                event={event}
                participantId={selectedParticipant}
                availability={availability}
              />
              <HeatmapGrid
                event={event}
                participants={participants}
                availability={availability}
              />
            </div>

            <div className="mt-6">
              <SuggestedTimes
                event={event}
                participants={participants}
                availability={availability}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EventPage;
