import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ChartLine, Building2, Mail, User as UserIcon, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";
import { DEPARTMENTS, TEAM_OPTIONS } from "@shared/constants";

export default function RequesterSignup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [department, setDepartment] = useState<string>("");
  const [team, setTeam] = useState<string>("");
  const [teamOther, setTeamOther] = useState<string>("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate company email
    const email = user?.email?.toLowerCase() || '';
    const allowedDomains = ['@taleemabad.com', '@niete.edu.pk'];
    const hasValidDomain = allowedDomains.some(domain => email.endsWith(domain));
    
    if (!hasValidDomain) {
      toast({
        title: "Invalid Email",
        description: "Data Requesters must use a company email address (@taleemabad.com or @niete.edu.pk)",
        variant: "destructive",
      });
      return;
    }

    if (!department) {
      toast({
        title: "Department Required",
        description: "Please select your team/department",
        variant: "destructive",
      });
      return;
    }

    if (!acceptedTerms) {
      toast({
        title: "Terms Required",
        description: "Please accept the terms and conditions",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Assign requester role with department
      await apiRequest("PATCH", "/api/auth/user/role", { 
        role: "requester",
        department 
      });

      // Update department
      await apiRequest("PATCH", "/api/auth/user/department", { department });

      // Clear selected_role from localStorage
      localStorage.removeItem("selected_role");

      // Invalidate user query to refresh
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });

      toast({
        title: "Account Created!",
        description: "Your Data Requester account has been set up successfully.",
      });

      // Redirect to dashboard
      setLocation("/");
    } catch (error: any) {
      console.error("Signup error:", error);
      
      // Extract error message from API response
      const errorMessage = error?.message || error?.response?.data?.message || "Failed to create account. Please try again.";
      
      toast({
        title: "Signup Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // If user already has a role, redirect to dashboard
  if (user?.role) {
    setLocation("/");
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      {/* Gradient header bar */}
      <div className="fixed top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-xl" style={{background: 'linear-gradient(135deg, hsl(239, 84%, 67%) 0%, hsl(260, 84%, 70%) 100%)'}}>
            <ChartLine className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent">
            Complete Your Profile
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Join DataHub as a Data Requester
          </p>
        </div>

        {/* Form Card */}
        <Card className="shadow-2xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-700">
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {/* Read-only user info */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-sm font-medium uppercase tracking-wide text-gray-700 dark:text-gray-300">
                  Full Name
                </Label>
                <div className="mt-2 relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="name"
                    type="text"
                    value={`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Not provided'}
                    disabled
                    className="pl-10 bg-gray-100 dark:bg-gray-700/50 border-gray-300 dark:border-gray-600"
                    data-testid="input-name"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  This information comes from your Replit account
                </p>
              </div>

              <div>
                <Label htmlFor="email" className="text-sm font-medium uppercase tracking-wide text-gray-700 dark:text-gray-300">
                  Email Address
                </Label>
                <div className="mt-2 relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || 'Not provided'}
                    disabled
                    className="pl-10 bg-gray-100 dark:bg-gray-700/50 border-gray-300 dark:border-gray-600"
                    data-testid="input-email"
                  />
                </div>
                {user?.email && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {user.email.endsWith('@taleemabad.com') || user.email.endsWith('@niete.edu.pk') 
                      ? '✓ Valid company email' 
                      : '⚠ Must be a company email (@taleemabad.com or @niete.edu.pk)'}
                  </p>
                )}
              </div>
            </div>

            {/* Department selection */}
            <div>
              <Label htmlFor="department" className="text-sm font-medium uppercase tracking-wide text-gray-700 dark:text-gray-300">
                Team / Department <span className="text-red-500">*</span>
              </Label>
              <div className="mt-2 relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10 pointer-events-none" />
                <Select value={department} onValueChange={setDepartment} required>
                  <SelectTrigger 
                    className="pl-10 h-12 border-2 focus:border-indigo-500 transition-colors"
                    data-testid="select-department"
                  >
                    <SelectValue placeholder="Select your team" />
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
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                This helps us route your data requests to the right team
              </p>
            </div>

            {/* Team selection - conditionally shown based on department */}
            {department && TEAM_OPTIONS[department] && (
              <div>
                <Label htmlFor="team" className="text-sm font-medium uppercase tracking-wide text-gray-700 dark:text-gray-300">
                  Team <span className="text-red-500">*</span>
                </Label>
                <div className="mt-2">
                  <Select value={team} onValueChange={setTeam} required>
                    <SelectTrigger 
                      className="h-12 border-2 focus:border-indigo-500 transition-colors"
                      data-testid="select-team"
                    >
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
              </div>
            )}

            {/* Team Other field - conditionally shown when "Other" is selected */}
            {team === 'Other' && (
              <div>
                <Label htmlFor="teamOther" className="text-sm font-medium uppercase tracking-wide text-gray-700 dark:text-gray-300">
                  Specify Team <span className="text-red-500">*</span>
                </Label>
                <div className="mt-2">
                  <Input
                    id="teamOther"
                    type="text"
                    value={teamOther}
                    onChange={(e) => setTeamOther(e.target.value)}
                    placeholder="Enter team name"
                    className="h-12 border-2 focus:border-indigo-500 transition-colors"
                    data-testid="input-team-other"
                  />
                </div>
              </div>
            )}

            {/* Role indicator */}
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                  Role: Data Requester
                </span>
              </div>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                You'll be able to submit and track data requests
              </p>
            </div>

            {/* Terms acceptance */}
            <div className="flex items-start gap-3">
              <Checkbox
                id="terms"
                checked={acceptedTerms}
                onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                className="mt-1"
                data-testid="checkbox-terms"
              />
              <Label htmlFor="terms" className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer leading-relaxed">
                I agree to the terms and conditions and privacy policy. I understand that my data requests will be reviewed by the Data Lead team.
              </Label>
            </div>

            {/* Submit button */}
            <Button
              type="submit"
              disabled={isSubmitting || !department || !acceptedTerms}
              className="w-full h-12 font-semibold text-base shadow-lg hover:shadow-xl transition-all"
              style={{background: 'linear-gradient(135deg, hsl(239, 84%, 67%) 0%, hsl(260, 84%, 70%) 100%)'}}
              data-testid="button-create-account"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center space-y-2">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Already have an account?{' '}
            <a href="/" className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
              Sign in
            </a>
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
            <a href="#" className="hover:text-gray-600 dark:hover:text-gray-300">Terms</a>
            <span>·</span>
            <a href="#" className="hover:text-gray-600 dark:hover:text-gray-300">Privacy</a>
            <span>·</span>
            <a href="#" className="hover:text-gray-600 dark:hover:text-gray-300">Support</a>
          </div>
        </div>
      </div>
    </div>
  );
}
