import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Index = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    creatorName: "",
    startDate: "",
    endDate: "",
    startTime: "09:00",
    endTime: "17:00",
  });

  const generateSlug = () => {
    return Math.random().toString(36).substring(2, 10);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const slug = generateSlug();
      const { data, error } = await supabase
        .from("events")
        .insert({
          title: formData.title,
          description: formData.description,
          creator_name: formData.creatorName,
          start_date: formData.startDate,
          end_date: formData.endDate,
          start_time: formData.startTime,
          end_time: formData.endTime,
          slug,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Event created!");
      navigate(`/event/${slug}`);
    } catch (error) {
      console.error("Error creating event:", error);
      toast.error("Failed to create event");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <div className="container max-w-2xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            when3meet
          </h1>
          <p className="text-lg text-muted-foreground">
            Find the perfect time to meet, better than ever
          </p>
        </div>

        <div className="bg-card rounded-2xl shadow-xl p-8 border border-border">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Event Name</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Team Standup"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Weekly sync to discuss progress..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="creatorName">Your Name</Label>
              <Input
                id="creatorName"
                value={formData.creatorName}
                onChange={(e) => setFormData({ ...formData, creatorName: e.target.value })}
                placeholder="Alex Smith"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              Create Event
            </Button>
          </form>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-6 bg-card/50 rounded-xl border border-border/50">
            <Calendar className="w-10 h-10 mx-auto mb-3 text-primary" />
            <h3 className="font-semibold mb-2">Flexible Scheduling</h3>
            <p className="text-sm text-muted-foreground">
              Set date ranges and time slots that work for everyone
            </p>
          </div>
          <div className="text-center p-6 bg-card/50 rounded-xl border border-border/50">
            <Clock className="w-10 h-10 mx-auto mb-3 text-accent" />
            <h3 className="font-semibold mb-2">Smart Suggestions</h3>
            <p className="text-sm text-muted-foreground">
              Get optimal meeting times based on preferences
            </p>
          </div>
          <div className="text-center p-6 bg-card/50 rounded-xl border border-border/50">
            <Users className="w-10 h-10 mx-auto mb-3 text-preferred" />
            <h3 className="font-semibold mb-2">Easy Collaboration</h3>
            <p className="text-sm text-muted-foreground">
              Share a link and collect availability instantly
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
