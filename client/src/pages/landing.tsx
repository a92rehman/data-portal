import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChartLine } from "lucide-react";

export default function Landing() {
  const handleReplitAuth = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary rounded-lg mx-auto mb-4 flex items-center justify-center">
                <ChartLine className="w-8 h-8 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Taleemabad</h1>
              <p className="text-muted-foreground">Data Request Management System</p>
            </div>

            <div className="space-y-4">
              <Button 
                className="w-full py-3" 
                onClick={handleReplitAuth}
                data-testid="button-replit-auth"
              >
                Sign in with Replit Auth
              </Button>

              <p className="text-xs text-center text-muted-foreground mt-4">
                Access restricted to Taleemabad team members
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
