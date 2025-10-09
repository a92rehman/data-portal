import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChartLine, Sparkles, TrendingUp, Users, BarChart3, Building2 } from "lucide-react";

export default function Landing() {
  const handleRoleSelection = (role: "requester" | "team_lead" | "analyst") => {
    localStorage.setItem("selected_role", role);
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-purple-950 dark:via-blue-950 dark:to-pink-950"></div>
      
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-20 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-20 left-40 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
      </div>

      <div className="w-full max-w-5xl relative z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6 shadow-2xl" style={{background: 'linear-gradient(135deg, hsl(239, 84%, 67%) 0%, hsl(260, 84%, 70%) 100%)'}}>
            <ChartLine className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent">
            Taleemabad
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-2">Data Request Management System</p>
          <div className="flex items-center justify-center gap-2 text-purple-600 dark:text-purple-400">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">Streamline Your Data Analytics Workflow</span>
            <Sparkles className="w-4 h-4" />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <Card className="border-2 border-purple-200 shadow-xl hover:shadow-2xl transition-all duration-300 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{background: 'linear-gradient(135deg, hsl(239, 84%, 67%) 0%, hsl(260, 84%, 70%) 100%)'}}>
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2 text-gray-900">Request & Track</h3>
                  <p className="text-sm text-gray-600">Submit data requests and track their progress in real-time with our intuitive dashboard.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-blue-200 shadow-xl hover:shadow-2xl transition-all duration-300 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{background: 'linear-gradient(135deg, hsl(199, 89%, 48%) 0%, hsl(209, 89%, 53%) 100%)'}}>
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2 text-gray-900">Collaborate</h3>
                  <p className="text-sm text-gray-600">Work seamlessly with your team through comments, assignments, and file sharing.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-2xl border-2 border-gray-200 bg-white/90 backdrop-blur-sm">
          <CardContent className="p-10">
            <div className="text-center space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-3 text-gray-900">Choose Your Role</h2>
                <p className="text-gray-600">Select your role to continue</p>
              </div>

              <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                <Card className="border-2 border-green-300 hover:border-green-500 transition-all cursor-pointer group shadow-lg hover:shadow-xl" onClick={() => handleRoleSelection("requester")}>
                  <CardContent className="p-6 text-center">
                    <div className="w-14 h-14 mx-auto rounded-2xl mb-3 flex items-center justify-center group-hover:scale-110 transition-transform" style={{background: 'linear-gradient(135deg, hsl(142, 76%, 36%) 0%, hsl(142, 71%, 45%) 100%)'}}>
                      <Users className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-lg font-bold mb-2 text-gray-900">Data Requester</h3>
                    <p className="text-xs text-gray-600 mb-3">Submit data requests and track their status</p>
                    <div className="mb-3 p-2 bg-green-50 rounded-md border border-green-200">
                      <p className="text-xs text-green-700 font-medium">Requires company email</p>
                      <p className="text-xs text-green-600">@taleemabad.com or @niete.edu.pk</p>
                    </div>
                    <Button 
                      className="w-full font-semibold rounded-lg shadow-md hover:shadow-lg transition-all text-sm"
                      style={{background: 'linear-gradient(135deg, hsl(142, 76%, 36%) 0%, hsl(142, 71%, 45%) 100%)'}}
                      data-testid="button-login-requester"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Data Requester
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-2 border-blue-300 hover:border-blue-500 transition-all cursor-pointer group shadow-lg hover:shadow-xl" onClick={() => handleRoleSelection("team_lead")}>
                  <CardContent className="p-6 text-center">
                    <div className="w-14 h-14 mx-auto rounded-2xl mb-3 flex items-center justify-center group-hover:scale-110 transition-transform" style={{background: 'linear-gradient(135deg, hsl(199, 89%, 48%) 0%, hsl(209, 89%, 53%) 100%)'}}>
                      <Building2 className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-lg font-bold mb-2 text-gray-900">Data Lead</h3>
                    <p className="text-xs text-gray-600 mb-3">Manage requests, assign tasks, and oversee team</p>
                    <div className="mb-3 p-2 bg-blue-50 rounded-md border border-blue-200">
                      <p className="text-xs text-blue-700 font-medium">Bootstrap access only</p>
                      <p className="text-xs text-blue-600">abdur.rehman@taleemabad.com</p>
                    </div>
                    <Button 
                      className="w-full font-semibold rounded-lg shadow-md hover:shadow-lg transition-all text-sm"
                      style={{background: 'linear-gradient(135deg, hsl(199, 89%, 48%) 0%, hsl(209, 89%, 53%) 100%)'}}
                      data-testid="button-login-team-lead"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Data Lead
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-2 border-purple-300 hover:border-purple-500 transition-all cursor-pointer group shadow-lg hover:shadow-xl" onClick={() => handleRoleSelection("analyst")}>
                  <CardContent className="p-6 text-center">
                    <div className="w-14 h-14 mx-auto rounded-2xl mb-3 flex items-center justify-center group-hover:scale-110 transition-transform" style={{background: 'linear-gradient(135deg, hsl(239, 84%, 67%) 0%, hsl(260, 84%, 70%) 100%)'}}>
                      <BarChart3 className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-lg font-bold mb-2 text-gray-900">Data Analyst</h3>
                    <p className="text-xs text-gray-600 mb-3">Sign in with email invitation from Data Lead</p>
                    <div className="mb-3 p-2 bg-purple-50 rounded-md border border-purple-200">
                      <p className="text-xs text-purple-700 font-medium">Requires invitation</p>
                      <p className="text-xs text-purple-600">Contact Data Lead to get started</p>
                    </div>
                    <Button 
                      className="w-full font-semibold rounded-lg shadow-md hover:shadow-lg transition-all text-sm"
                      style={{background: 'linear-gradient(135deg, hsl(239, 84%, 67%) 0%, hsl(260, 84%, 70%) 100%)'}}
                      data-testid="button-login-analyst"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Data Analyst
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-4 space-y-2">
                <p className="text-xs text-gray-500">
                  Access restricted to Taleemabad team members
                </p>
                <p className="text-xs text-gray-500">
                  Note: Data Leads can manage team members from the Team Management page
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}
