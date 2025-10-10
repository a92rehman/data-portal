import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChartLine, Sparkles, TrendingUp, Users, Shield, Zap, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

export default function Landing() {
  const [, setLocation] = useLocation();

  return (
    <div className="h-[100lvh] flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-purple-950 dark:via-blue-950 dark:to-pink-950"></div>
      
      <div className="absolute inset-0 opacity-30 dark:opacity-20">
        <div className="absolute top-20 left-20 w-72 h-72 bg-purple-300 dark:bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-blue-300 dark:bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-20 left-40 w-72 h-72 bg-pink-300 dark:bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
      </div>

      <div className="w-full max-w-6xl relative z-10 space-y-8 lg:space-y-12">
        <div className="text-center space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4 shadow-2xl" style={{background: 'linear-gradient(135deg, hsl(239, 84%, 67%) 0%, hsl(260, 84%, 70%) 100%)'}}>
            <ChartLine className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent leading-tight">
            Taleemabad DataHub
          </h1>
          <p className="text-xl sm:text-2xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Streamline your data requests and collaborate seamlessly with your team
          </p>
          <div className="flex items-center justify-center gap-2 text-purple-600 dark:text-purple-400">
            <Sparkles className="w-5 h-5" />
            <span className="text-sm sm:text-base font-medium">Empower Your Data Workflow</span>
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
          <Button 
            size="lg"
            className="w-full sm:w-auto text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all px-8 py-6"
            style={{background: 'linear-gradient(135deg, hsl(239, 84%, 67%) 0%, hsl(260, 84%, 70%) 100%)'}}
            onClick={() => setLocation("/auth")}
            data-testid="button-signin"
          >
            Sign In
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          <Button 
            size="lg"
            variant="outline"
            className="w-full sm:w-auto text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all border-2 border-purple-300 hover:border-purple-500 dark:border-purple-600 dark:hover:border-purple-400 px-8 py-6"
            onClick={() => {
              localStorage.setItem("signup_mode", "true");
              setLocation("/auth");
            }}
            data-testid="button-signup"
          >
            Sign Up
            <Sparkles className="w-5 h-5 ml-2" />
          </Button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
          <div className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-purple-400 rounded-2xl opacity-20 group-hover:opacity-30 transition duration-300 blur"></div>
            <div className="relative bg-white dark:bg-gray-900 rounded-2xl p-8 border border-purple-100 dark:border-purple-900">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg" style={{background: 'linear-gradient(135deg, hsl(239, 84%, 67%) 0%, hsl(260, 84%, 70%) 100%)'}}>
                  <TrendingUp className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-xl mb-2 text-gray-900 dark:text-white">Request & Track</h3>
                  <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">Submit data requests and monitor their progress in real-time with status updates</p>
                </div>
              </div>
            </div>
          </div>

          <div className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-2xl opacity-20 group-hover:opacity-30 transition duration-300 blur"></div>
            <div className="relative bg-white dark:bg-gray-900 rounded-2xl p-8 border border-blue-100 dark:border-blue-900">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg" style={{background: 'linear-gradient(135deg, hsl(199, 89%, 48%) 0%, hsl(209, 89%, 53%) 100%)'}}>
                  <Users className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-xl mb-2 text-gray-900 dark:text-white">Team Collaboration</h3>
                  <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">Work together seamlessly through comments, task assignments, and file sharing</p>
                </div>
              </div>
            </div>
          </div>

          <div className="group relative sm:col-span-2 lg:col-span-1">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-500 to-rose-400 rounded-2xl opacity-20 group-hover:opacity-30 transition duration-300 blur"></div>
            <div className="relative bg-white dark:bg-gray-900 rounded-2xl p-8 border border-pink-100 dark:border-pink-900">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg" style={{background: 'linear-gradient(135deg, hsl(330, 80%, 60%) 0%, hsl(340, 82%, 65%) 100%)'}}>
                  <Zap className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-xl mb-2 text-gray-900 dark:text-white">Instant Analytics</h3>
                  <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">Get actionable insights into team performance and comprehensive request metrics</p>
                </div>
              </div>
            </div>
          </div>
        </div>

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
