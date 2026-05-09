import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { ChartLine, Sparkles, Loader2, Eye, EyeOff, Building2 } from "lucide-react";
import { DEPARTMENTS, TEAM_OPTIONS } from "@shared/constants";

const TEST_EMAILS = ["ar09info@gmail.com", "ar92info@gmail.com"];

export default function AuthSimple() {
  const [showPassword, setShowPassword] = useState(false);
  const [_, setLocation] = useLocation();
  const { login, signup, isLoggingIn, isSigningUp } = useAuth();
  const { toast } = useToast();

  // Get selected role from landing page
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [isSignup, setIsSignup] = useState(false);

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [department, setDepartment] = useState("");
  const [team, setTeam] = useState("");
  const [teamOther, setTeamOther] = useState("");

  useEffect(() => {
    const role = localStorage.getItem("selected_role");
    const signupMode = localStorage.getItem("signup_mode");
    
    setSelectedRole(role);
    
    // If signup mode is true (from landing page), show signup form as requester
    if (signupMode === "true") {
      setIsSignup(true);
      setSelectedRole("requester");
      localStorage.setItem("selected_role", "requester");
      localStorage.removeItem("signup_mode");
    } else if (role === "requester") {
      // If requester role selected, show signup form
      setIsSignup(true);
    } else {
      setIsSignup(false);
    }
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await login({ email, password });
      await queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Welcome back!",
        description: "You've successfully logged in.",
      });
      localStorage.removeItem("selected_role");
      setLocation("/");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error.message || "Invalid email or password",
      });
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedRole === "requester") {
      if (!department) {
        toast({
          title: "Department Required",
          description: "Please select your team/department",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      const name = `${firstName} ${lastName}`.trim();
      await signup({ 
        email, 
        password, 
        name,
        role: selectedRole || "requester",
        department: selectedRole === "requester" ? department : undefined
      });
      
      await queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
      
      toast({
        title: "Account created!",
        description: "Your account has been created successfully.",
      });
      
      localStorage.removeItem("selected_role");
      setLocation("/");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Signup failed",
        description: error.message || "Failed to create account",
      });
    }
  };

  const getPageTitle = () => {
    if (selectedRole === "requester" && isSignup) return "Create Requester Account";
    if (selectedRole === "team_lead") return "Data Lead Login";
    if (selectedRole === "analyst") return "Data Analyst Login";
    return "Login";
  };

  const getSubtitle = () => {
    if (selectedRole === "requester" && isSignup) return "Sign up to submit data requests";
    if (selectedRole === "team_lead") return "Access your Data Lead portal";
    if (selectedRole === "analyst") return "You must be invited by a Data Lead";
    return "Sign in to continue";
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-purple-950 dark:via-blue-950 dark:to-pink-950"></div>
      
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-20 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-20 left-40 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
      </div>

      <Card className="w-full max-w-md relative z-10 shadow-2xl border-2 border-gray-200 bg-white/90 backdrop-blur-sm">
        <CardHeader className="text-center pb-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 mx-auto shadow-2xl" style={{background: 'linear-gradient(135deg, hsl(239, 84%, 67%) 0%, hsl(260, 84%, 70%) 100%)'}}>
            <ChartLine className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent">
            {getPageTitle()}
          </CardTitle>
          <div className="flex items-center justify-center gap-2 text-purple-600 dark:text-purple-400 mt-2">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">{getSubtitle()}</span>
            <Sparkles className="w-4 h-4" />
          </div>
        </CardHeader>

        <CardContent>
          {isSignup && selectedRole === "requester" ? (
            <form onSubmit={handleSignupSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                    required
                    data-testid="input-firstname"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    required
                    data-testid="input-lastname"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  data-testid="input-email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10 pointer-events-none" />
                  <Select value={department} onValueChange={setDepartment} required>
                    <SelectTrigger className="pl-10" data-testid="select-department">
                      <SelectValue placeholder="Select your department" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {department && TEAM_OPTIONS[department] && (
                <div className="space-y-2">
                  <Label htmlFor="team">Team</Label>
                  <Select value={team} onValueChange={setTeam} required>
                    <SelectTrigger data-testid="select-team">
                      <SelectValue placeholder="Select your team" />
                    </SelectTrigger>
                    <SelectContent>
                      {TEAM_OPTIONS[department].map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {team === 'Other' && (
                <div className="space-y-2">
                  <Label htmlFor="teamOther">Specify Team</Label>
                  <Input
                    id="teamOther"
                    type="text"
                    value={teamOther}
                    onChange={(e) => setTeamOther(e.target.value)}
                    placeholder="Enter team name"
                    data-testid="input-team-other"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="new-password"
                    data-testid="input-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                disabled={isSigningUp}
                data-testid="button-submit-signup"
              >
                {isSigningUp ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>

              <div className="text-center text-sm">
                <span className="text-gray-600">Already have an account? </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsSignup(false);
                    localStorage.removeItem("selected_role");
                    setSelectedRole(null);
                  }}
                  className="text-purple-600 hover:underline"
                  data-testid="button-switch-to-login"
                >
                  Login
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  data-testid="input-email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    data-testid="input-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end">
                <a
                  href="/forgot-password"
                  className="text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 font-medium transition-colors duration-200"
                  data-testid="link-forgot-password"
                >
                  Forgot Password?
                </a>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                disabled={isLoggingIn}
                data-testid="button-submit-login"
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  "Login"
                )}
              </Button>

              {!selectedRole || selectedRole === "requester" ? (
                <div className="text-center text-sm">
                  <span className="text-gray-600">Don't have an account? </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignup(true);
                      setSelectedRole("requester");
                      localStorage.setItem("selected_role", "requester");
                    }}
                    className="text-purple-600 hover:underline"
                    data-testid="button-switch-to-signup"
                  >
                    Sign up
                  </button>
                </div>
              ) : null}
            </form>
          )}

          <div className="mt-6 text-center">
            <Button
              variant="ghost"
              onClick={() => {
                localStorage.removeItem("selected_role");
                setLocation("/");
              }}
              data-testid="button-back"
            >
              ← Back to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
