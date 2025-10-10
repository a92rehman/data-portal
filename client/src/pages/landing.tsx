import { Button } from "@/components/ui/button";
import { ChartLine, ArrowRight, TrendingUp, Users, Zap } from "lucide-react";
import { useLocation } from "wouter";

export default function Landing() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-[100lvh] flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-950 dark:via-blue-950 dark:to-purple-950">
      
      {/* Concentric circles gradient effect */}
      <div className="absolute inset-0 flex items-center justify-center opacity-40 dark:opacity-20">
        <div className="absolute w-[300px] h-[300px] rounded-full bg-gradient-to-br from-purple-200 to-transparent dark:from-purple-400 blur-3xl"></div>
        <div className="absolute w-[500px] h-[500px] rounded-full bg-gradient-to-br from-blue-200 to-transparent dark:from-blue-400 blur-3xl"></div>
        <div className="absolute w-[700px] h-[700px] rounded-full bg-gradient-to-br from-purple-100 to-transparent dark:from-purple-500 blur-3xl"></div>
        <div className="absolute w-[900px] h-[900px] rounded-full bg-gradient-to-br from-blue-100 to-transparent dark:from-blue-500 blur-3xl"></div>
      </div>

      <div className="w-full max-w-4xl relative z-10 space-y-12 text-center">
        {/* Logo */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl shadow-xl" style={{background: 'linear-gradient(135deg, hsl(239, 84%, 67%) 0%, hsl(260, 84%, 70%) 100%)'}}>
          <ChartLine className="w-8 h-8 text-white" />
        </div>

        {/* Main Headline */}
        <div className="space-y-6">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white leading-tight max-w-3xl mx-auto">
            Data requests, collaboration, insights
            <span className="block mt-2 bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
              — all in one platform
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
            We help teams submit requests, track progress, and collaborate seamlessly to drive data-driven decisions
          </p>
        </div>

        {/* CTA Button */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button 
            size="lg"
            className="text-base font-semibold rounded-full shadow-xl hover:shadow-2xl transition-all px-10 py-6 text-white"
            style={{background: 'linear-gradient(135deg, hsl(239, 84%, 67%) 0%, hsl(260, 84%, 70%) 100%)'}}
            onClick={() => {
              localStorage.setItem("signup_mode", "true");
              setLocation("/auth");
            }}
            data-testid="button-get-started"
          >
            Get Started
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          <Button 
            size="lg"
            variant="ghost"
            className="text-base font-semibold rounded-full px-10 py-6 hover:bg-purple-100 dark:hover:bg-purple-900/20"
            onClick={() => setLocation("/auth")}
            data-testid="button-signin"
          >
            Sign In
          </Button>
        </div>

        {/* Floating Feature Icons */}
        <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto mt-16">
          <div className="flex flex-col items-center gap-3 group">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-white dark:bg-gray-800 shadow-lg group-hover:shadow-xl transition-all border border-gray-200 dark:border-gray-700">
              <TrendingUp className="w-7 h-7 text-purple-600 dark:text-purple-400" />
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Track Progress</p>
          </div>
          <div className="flex flex-col items-center gap-3 group">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-white dark:bg-gray-800 shadow-lg group-hover:shadow-xl transition-all border border-gray-200 dark:border-gray-700">
              <Users className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Collaborate</p>
          </div>
          <div className="flex flex-col items-center gap-3 group">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-white dark:bg-gray-800 shadow-lg group-hover:shadow-xl transition-all border border-gray-200 dark:border-gray-700">
              <Zap className="w-7 h-7 text-pink-600 dark:text-pink-400" />
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Get Insights</p>
          </div>
        </div>
      </div>
    </div>
  );
}
