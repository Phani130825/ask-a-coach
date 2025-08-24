import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon } from "lucide-react";

const Settings = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600">Manage your account preferences and application settings.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Account Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 border rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-r from-brand-primary to-brand-secondary rounded-xl text-white">
                    <SettingsIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="font-semibold">Profile & Preferences</div>
                    <div className="text-sm text-gray-500">Update your display name, notification preferences and more.</div>
                  </div>
                </div>
                <div className="mt-4">
                  <Button variant="default">Edit Profile</Button>
                </div>
              </div>

              <div className="text-sm text-gray-600">More settings can be added: notifications, privacy, integrations, etc.</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
