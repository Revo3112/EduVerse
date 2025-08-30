import Image from "next/image";
import { ConnectWallet } from "../components/ConnectWallet";
import { Web3Status } from "../components/Web3Status";
import { CourseInteraction } from "../components/CourseInteraction";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import ModeToggle from "../../components/mode-toggle";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 transition-colors duration-300">
      {/* Modern Header with Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
                  <span className="text-primary-foreground text-sm font-bold">E</span>
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                  EduVerse
                </span>
              </div>
            </div>

            <nav className="hidden md:flex items-center space-x-6">
              <a href="#courses" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Courses
              </a>
              <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Features
              </a>
              <a href="#about" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                About
              </a>
            </nav>

            <div className="flex items-center space-x-4">
              <ModeToggle />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Enhanced Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6 backdrop-blur-sm">
            🚀 Powered by Thirdweb v5 & Manta Pacific
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-foreground via-primary to-primary/80 bg-clip-text text-transparent mb-6 leading-tight">
            EduVerse Web3
          </h1>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-muted-foreground mb-6">
            Decentralized Learning Platform
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
            Experience the future of education with blockchain-powered courses, NFT certificates,
            and decentralized learning on Manta Pacific Testnet.
          </p>
        </div>

        {/* Status Alert */}
        <div className="mb-12">
          <Alert className="border-primary/20 bg-primary/10 max-w-4xl mx-auto">
            <AlertDescription className="text-foreground">
              🎉 <strong>EduVerse Platform Active!</strong> All systems operational with shadcn/ui + Thirdweb v5 integration.
            </AlertDescription>
          </Alert>
        </div>

        {/* Enhanced Feature Cards with Better Text Handling */}
        <div className="grid gap-8 lg:grid-cols-3 mb-16">
          {/* Enhanced Wallet Connection Card */}
          <Card className="border-border bg-gradient-to-br from-card to-muted/30 hover:shadow-lg transition-all duration-300">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl font-bold text-primary flex items-center justify-center gap-2 break-words">
                🔗 <span className="truncate">Connect Wallet</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ConnectWallet />
              <div className="text-center">
                <p className="text-sm text-muted-foreground leading-relaxed break-words">
                  Support 500+ wallets including MetaMask, WalletConnect, Coinbase Wallet
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Web3 Status Card */}
          <Card className="border-border bg-gradient-to-br from-card to-muted/30 hover:shadow-lg transition-all duration-300">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl font-bold text-primary flex items-center justify-center gap-2 break-words">
                ⚡ <span className="truncate">Wallet Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Web3Status />
            </CardContent>
          </Card>

          {/* Enhanced Course Interaction Card */}
          <Card className="border-border bg-gradient-to-br from-card to-muted/30 hover:shadow-lg transition-all duration-300">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl font-bold text-primary flex items-center justify-center gap-2 break-words">
                🎓 <span className="truncate">Smart Contracts</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CourseInteraction />
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Course Creation Interactive Section */}
        <div className="mb-16">
          <Card className="border-border bg-gradient-to-r from-card via-muted/20 to-card hover:shadow-lg transition-all duration-300">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent mb-2">
                🚀 Create Your First Course
              </CardTitle>
              <p className="text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                Launch educational content on the blockchain with just a few clicks
              </p>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="courseName" className="text-sm font-medium text-foreground">
                      Course Name
                    </Label>
                    <Input
                      id="courseName"
                      placeholder="e.g. Introduction to DeFi"
                      className="h-11 bg-background border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm font-medium text-foreground">
                      Course Description
                    </Label>
                    <Input
                      id="description"
                      placeholder="Brief description of your course content"
                      className="h-11 bg-background border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price" className="text-sm font-medium text-foreground">
                      Course Price (ETH)
                    </Label>
                    <Input
                      id="price"
                      type="number"
                      placeholder="0.002"
                      step="0.001"
                      className="h-11 bg-background border-border"
                    />
                  </div>
                </div>
                <div className="flex flex-col justify-center space-y-6">
                  <div className="p-6 bg-gradient-to-br from-muted/50 to-muted/20 rounded-xl border border-border">
                    <h4 className="font-semibold text-primary mb-3">Features Include:</h4>
                    <ul className="text-sm text-muted-foreground space-y-2">
                      <li className="flex items-center gap-2">
                        <span className="text-primary">✅</span>
                        <span className="break-words">IPFS Content Storage</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-primary">✅</span>
                        <span className="break-words">ERC1155 License NFTs</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-primary">✅</span>
                        <span className="break-words">Progress Tracking</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-primary">✅</span>
                        <span className="break-words">Completion Certificates</span>
                      </li>
                    </ul>
                  </div>
                  <Button size="lg" className="h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300">
                    Deploy Course Contract
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Platform Information Cards */}
        <div className="grid gap-8 lg:grid-cols-2 mb-16">
          {/* EduVerse Smart Contracts */}
          <Card className="border-border bg-gradient-to-br from-card to-muted/30 hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent flex items-center gap-2">
                📋 <span className="break-words">Platform Architecture</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-primary/10 rounded-xl border border-primary/20 hover:shadow-md transition-all duration-200">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center text-primary-foreground font-bold text-sm shadow-lg">
                  1
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-primary truncate">CourseFactory</p>
                  <p className="text-sm text-muted-foreground break-words">Course creation & IPFS storage</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-secondary/50 rounded-xl border border-border hover:shadow-md transition-all duration-200">
                <div className="w-10 h-10 bg-gradient-to-br from-secondary-foreground to-secondary-foreground/80 rounded-xl flex items-center justify-center text-secondary font-bold text-sm shadow-lg">
                  2
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-secondary-foreground truncate">CourseLicense</p>
                  <p className="text-sm text-muted-foreground break-words">ERC1155 licensing system</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-accent/50 rounded-xl border border-border hover:shadow-md transition-all duration-200">
                <div className="w-10 h-10 bg-gradient-to-br from-accent-foreground to-accent-foreground/80 rounded-xl flex items-center justify-center text-accent font-bold text-sm shadow-lg">
                  3
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-accent-foreground truncate">ProgressTracker</p>
                  <p className="text-sm text-muted-foreground break-words">Student progress monitoring</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl border border-border hover:shadow-md transition-all duration-200">
                <div className="w-10 h-10 bg-gradient-to-br from-muted-foreground to-muted-foreground/80 rounded-xl flex items-center justify-center text-muted font-bold text-sm shadow-lg">
                  4
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-muted-foreground truncate">CertificateManager</p>
                  <p className="text-sm text-muted-foreground break-words">NFT certificate issuance</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Technology Stack */}
          <Card className="border-border bg-gradient-to-br from-card to-muted/30 hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent flex items-center gap-2">
                🛠️ <span className="break-words">Technology Stack</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-3">
                  <h4 className="font-semibold text-primary text-sm">Frontend Technologies</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-xs">Next.js 15</Badge>
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-xs">React 19</Badge>
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-xs">TypeScript</Badge>
                  </div>
                </div>

                <Separator className="opacity-30" />

                <div className="space-y-3">
                  <h4 className="font-semibold text-primary text-sm">UI & Styling</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="bg-secondary/50 text-secondary-foreground border-border text-xs">Tailwind CSS v4</Badge>
                    <Badge variant="secondary" className="bg-secondary/50 text-secondary-foreground border-border text-xs">shadcn/ui</Badge>
                    <Badge variant="secondary" className="bg-secondary/50 text-secondary-foreground border-border text-xs">Geist Fonts</Badge>
                  </div>
                </div>

                <Separator className="opacity-30" />

                <div className="space-y-3">
                  <h4 className="font-semibold text-primary text-sm">Web3 Integration</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="bg-accent/50 text-accent-foreground border-border text-xs">Thirdweb v5</Badge>
                    <Badge variant="secondary" className="bg-accent/50 text-accent-foreground border-border text-xs">Wagmi</Badge>
                    <Badge variant="secondary" className="bg-accent/50 text-accent-foreground border-border text-xs">Viem</Badge>
                  </div>
                </div>

                <Separator className="opacity-30" />

                <div className="space-y-3">
                  <h4 className="font-semibold text-primary text-sm">Blockchain</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="bg-muted text-muted-foreground border-border text-xs">Solidity 0.8+</Badge>
                    <Badge variant="secondary" className="bg-muted text-muted-foreground border-border text-xs">Manta Pacific</Badge>
                    <Badge variant="secondary" className="bg-muted text-muted-foreground border-border text-xs">IPFS</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Footer */}
        <footer className="text-center py-12 border-t border-border/50 mt-16">
          <div className="flex items-center justify-center gap-6 mb-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 bg-gradient-to-br from-primary to-primary/80 rounded flex items-center justify-center">
                <span className="text-primary-foreground text-xs font-bold">E</span>
              </div>
              <span className="font-bold text-foreground">EduVerse</span>
            </div>
            <span className="text-muted-foreground">×</span>
            <span className="font-semibold text-primary">Thirdweb v5</span>
            <span className="text-muted-foreground">×</span>
            <span className="font-semibold text-secondary-foreground">shadcn/ui</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Built with cutting-edge Web3 technologies for the future of decentralized education
          </p>
        </footer>
      </div>
    </div>
  );
}
