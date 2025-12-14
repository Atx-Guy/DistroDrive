import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DistributionCard } from "@/components/DistributionCard";
import { getTopMatches, type MatcherInputs, type ScoredDistribution } from "@/lib/distroMatcher";
import type { ExperienceLevel, UseCase, Hardware } from "@/data/distro-tags";
import type { DistributionWithLatestRelease } from "@shared/schema";
import { 
  Terminal, User, Code, Zap, Gamepad2, Server, Monitor, Shield, 
  Laptop, Cpu, ChevronRight, ChevronLeft, RotateCcw, Sparkles,
  Home, HardDrive, Newspaper
} from "lucide-react";

const experienceOptions: { value: ExperienceLevel; label: string; description: string; icon: typeof User }[] = [
  { value: "beginner", label: "Beginner", description: "New to Linux, want something easy", icon: User },
  { value: "intermediate", label: "Intermediate", description: "Some experience, comfortable with terminal", icon: Code },
  { value: "expert", label: "Expert", description: "Advanced user, want full control", icon: Zap },
];

const useCaseOptions: { value: UseCase; label: string; icon: typeof Monitor }[] = [
  { value: "desktop", label: "Daily Desktop", icon: Monitor },
  { value: "gaming", label: "Gaming", icon: Gamepad2 },
  { value: "server", label: "Server/Hosting", icon: Server },
  { value: "development", label: "Development", icon: Code },
  { value: "privacy", label: "Privacy/Security", icon: Shield },
];

const hardwareOptions: { value: Hardware; label: string; description: string; icon: typeof Laptop }[] = [
  { value: "low-end", label: "Older/Low-end", description: "Limited RAM, older CPU", icon: Laptop },
  { value: "modern", label: "Modern", description: "Newer hardware, 8GB+ RAM", icon: Cpu },
];

function OptionCard({ 
  selected, 
  onClick, 
  icon: Icon, 
  label, 
  description,
  testId,
}: { 
  selected: boolean; 
  onClick: () => void; 
  icon: typeof User; 
  label: string; 
  description?: string;
  testId: string;
}) {
  return (
    <Card
      className={`p-4 cursor-pointer transition-all hover-elevate active-elevate-2 ${
        selected ? "ring-2 ring-primary bg-primary/5" : ""
      }`}
      onClick={onClick}
      data-testid={testId}
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-md flex items-center justify-center ${
          selected ? "bg-primary text-primary-foreground" : "bg-muted"
        }`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="font-medium">{label}</p>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
    </Card>
  );
}

function ResultCard({ scored, maxScore }: { scored: ScoredDistribution; maxScore: number }) {
  const percentage = Math.min(100, Math.round((scored.score / maxScore) * 100));
  return (
    <div className="relative">
      <div className="absolute -top-2 -right-2 z-10">
        <Badge className="bg-primary text-primary-foreground">
          {percentage}% match
        </Badge>
      </div>
      <DistributionCard distribution={scored.distribution} />
      <div className="mt-2 flex flex-wrap gap-1">
        {scored.matchedTags.map((tag) => (
          <Badge key={tag} variant="outline" className="text-xs capitalize">
            {tag}
          </Badge>
        ))}
      </div>
    </div>
  );
}

export default function Matcher() {
  const [location] = useLocation();
  const [step, setStep] = useState(1);
  const [experience, setExperience] = useState<ExperienceLevel | null>(null);
  const [useCases, setUseCases] = useState<UseCase[]>([]);
  const [hardware, setHardware] = useState<Hardware | null>(null);

  const { data: distributions = [], isLoading } = useQuery<DistributionWithLatestRelease[]>({
    queryKey: ["/api/distributions"],
  });

  const toggleUseCase = (uc: UseCase) => {
    setUseCases((prev) =>
      prev.includes(uc) ? prev.filter((x) => x !== uc) : [...prev, uc]
    );
  };

  const canProceed = () => {
    if (step === 1) return experience !== null;
    if (step === 2) return useCases.length > 0;
    if (step === 3) return hardware !== null;
    return false;
  };

  const reset = () => {
    setStep(1);
    setExperience(null);
    setUseCases([]);
    setHardware(null);
  };

  const getResults = (): ScoredDistribution[] => {
    if (!experience || useCases.length === 0 || !hardware) return [];
    const inputs: MatcherInputs = { experience, useCases, hardware };
    return getTopMatches(inputs, distributions, 3);
  };

  const results = step === 4 ? getResults() : [];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-6 flex-wrap">
            <Link href="/" data-testid="link-home-logo">
              <div className="flex items-center gap-3 cursor-pointer">
                <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center">
                  <Terminal className="w-6 h-6 text-primary-foreground" />
                </div>
                <div className="hidden sm:block">
                  <h1 className="font-serif font-bold text-lg text-foreground leading-tight">
                    Linux Distro
                  </h1>
                  <p className="text-xs text-muted-foreground -mt-0.5">Directory</p>
                </div>
              </div>
            </Link>

            <nav className="flex items-center gap-1 flex-wrap">
              <Link href="/">
                <Button 
                  variant={location === "/" ? "secondary" : "ghost"} 
                  size="sm"
                  data-testid="link-nav-home"
                >
                  <Home className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Home</span>
                </Button>
              </Link>
              <Link href="/iso-browser">
                <Button 
                  variant={location === "/iso-browser" ? "secondary" : "ghost"} 
                  size="sm"
                  data-testid="link-nav-iso"
                >
                  <HardDrive className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">ISO Library</span>
                </Button>
              </Link>
              <Link href="/matcher">
                <Button 
                  variant={location === "/matcher" ? "secondary" : "ghost"} 
                  size="sm"
                  data-testid="link-nav-matcher"
                >
                  <Sparkles className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Distro Matcher</span>
                </Button>
              </Link>
              <Link href="/news">
                <Button 
                  variant={location === "/news" ? "secondary" : "ghost"} 
                  size="sm"
                  data-testid="link-nav-news"
                >
                  <Newspaper className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">News</span>
                </Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-8 flex items-center justify-center gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`w-3 h-3 rounded-full transition-colors ${
                s === step ? "bg-primary" : s < step ? "bg-primary/50" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-6" data-testid="step-experience">
            <div className="text-center">
              <h1 className="font-serif text-2xl font-bold mb-2">What's your experience level?</h1>
              <p className="text-muted-foreground">This helps us find distros that match your skill level</p>
            </div>
            <div className="grid gap-4">
              {experienceOptions.map((opt) => (
                <OptionCard
                  key={opt.value}
                  selected={experience === opt.value}
                  onClick={() => setExperience(opt.value)}
                  icon={opt.icon}
                  label={opt.label}
                  description={opt.description}
                  testId={`option-experience-${opt.value}`}
                />
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6" data-testid="step-usecase">
            <div className="text-center">
              <h1 className="font-serif text-2xl font-bold mb-2">What do you want to do?</h1>
              <p className="text-muted-foreground">Select all that apply</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {useCaseOptions.map((opt) => (
                <OptionCard
                  key={opt.value}
                  selected={useCases.includes(opt.value)}
                  onClick={() => toggleUseCase(opt.value)}
                  icon={opt.icon}
                  label={opt.label}
                  testId={`option-usecase-${opt.value}`}
                />
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6" data-testid="step-hardware">
            <div className="text-center">
              <h1 className="font-serif text-2xl font-bold mb-2">What hardware do you have?</h1>
              <p className="text-muted-foreground">This helps us recommend distros that run well on your system</p>
            </div>
            <div className="grid gap-4">
              {hardwareOptions.map((opt) => (
                <OptionCard
                  key={opt.value}
                  selected={hardware === opt.value}
                  onClick={() => setHardware(opt.value)}
                  icon={opt.icon}
                  label={opt.label}
                  description={opt.description}
                  testId={`option-hardware-${opt.value}`}
                />
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6" data-testid="step-results">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h1 className="font-serif text-2xl font-bold mb-2">Your Top Matches</h1>
              <p className="text-muted-foreground">
                Based on your preferences: {experience}, {useCases.join(", ")}, {hardware} hardware
              </p>
            </div>

            {isLoading ? (
              <div className="grid gap-6">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-48 w-full" />
                ))}
              </div>
            ) : results.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground mb-4">
                  No exact matches found. Try adjusting your preferences.
                </p>
                <Button onClick={reset} data-testid="button-retry">
                  <RotateCcw className="w-4 h-4" />
                  Start Over
                </Button>
              </Card>
            ) : (
              <div className="grid gap-6">
                {results.map((scored) => (
                  <ResultCard 
                    key={scored.distribution.id} 
                    scored={scored} 
                    maxScore={3 + (useCases.length * 2) + 1}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-8 flex items-center justify-between gap-4">
          {step > 1 && step < 4 && (
            <Button
              variant="outline"
              onClick={() => setStep((s) => s - 1)}
              data-testid="button-back"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>
          )}
          {step === 4 && (
            <Button variant="outline" onClick={reset} data-testid="button-start-over">
              <RotateCcw className="w-4 h-4" />
              Start Over
            </Button>
          )}
          {step === 1 && <div />}
          {step < 4 && (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canProceed()}
              className="ml-auto"
              data-testid="button-next"
            >
              {step === 3 ? "See Results" : "Next"}
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
