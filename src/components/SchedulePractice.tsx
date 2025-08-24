import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";

interface Props {
  onStart?: () => void;
}

const SchedulePractice = ({ onStart }: Props) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Schedule Practice</h1>
          <p className="text-gray-600">Pick a time and start a practice interview session.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Select a Slot</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 border rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-r from-brand-primary to-brand-secondary rounded-xl text-white">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="font-semibold">Today — 3:00 PM</div>
                    <div className="text-sm text-gray-500">Duration: 30 minutes</div>
                  </div>
                </div>
                <div className="mt-4">
                  <Button variant="hero" onClick={() => onStart && onStart()}>Start Now</Button>
                </div>
              </div>

              <div className="text-sm text-gray-600">More scheduling integrations can be added later (Google Calendar, Outlook).</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SchedulePractice;
