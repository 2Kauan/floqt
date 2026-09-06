import { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import {
  Download,
  Smartphone,
  Laptop,
  Apple,
  Chrome,
  Share,
  PlusSquare,
  CheckCircle2,
  Sparkles,
  Zap,
  Monitor,
  ShieldCheck,
} from 'lucide-react';
import { usePwaInstall } from '../../hooks/usePwaInstall';

interface InstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'chrome-desktop' | 'android' | 'ios' | 'safari-mac';

export function InstallModal({ isOpen, onClose }: InstallModalProps) {
  const { isInstallable, isStandalone, isIOS, promptInstall } = usePwaInstall();
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    if (isIOS) return 'ios';
    if (typeof window !== 'undefined' && /android/i.test(navigator.userAgent)) return 'android';
    return 'chrome-desktop';
  });
  const [isInstalling, setIsInstalling] = useState(false);

  const handleDirectInstall = async () => {
    setIsInstalling(true);
    try {
      const outcome = await promptInstall();
      if (outcome === 'accepted') {
        onClose();
      }
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Instalar FLOQT no seu dispositivo"
      description="Use o FLOQT como um aplicativo nativo no computador ou celular, com funcionamento 100% offline."
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* Standalone status banner */}
        {isStandalone ? (
          <div className="p-4 bg-accent/10 border border-accent/20 rounded-xl flex items-center gap-3 text-accent">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <div className="text-xs">
              <p className="font-semibold text-ink">Aplicativo já instalado!</p>
              <p className="text-ink-muted">Você já está utilizando o FLOQT no modo aplicativo independente.</p>
            </div>
          </div>
        ) : isInstallable ? (
          <div className="p-4 bg-accent/10 border border-accent/30 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent text-white">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">Instalação direta disponível</p>
                <p className="text-xs text-ink-muted">Seu navegador suporta instalação instantânea com 1 clique.</p>
              </div>
            </div>
            <Button
              variant="primary"
              onClick={handleDirectInstall}
              isLoading={isInstalling}
              leftIcon={<Download className="w-4 h-4" />}
              className="w-full sm:w-auto shrink-0"
            >
              Instalar Agora
            </Button>
          </div>
        ) : null}

        {/* Tab selection */}
        <div>
          <p className="text-xs font-semibold text-ink mb-2">Instruções por plataforma:</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-bg rounded-lg border border-border">
            <button
              type="button"
              onClick={() => setActiveTab('chrome-desktop')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'chrome-desktop'
                  ? 'bg-surface text-ink shadow-2xs font-semibold border border-border'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <Chrome className="w-3.5 h-3.5" />
              <span>Computador</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('android')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'android'
                  ? 'bg-surface text-ink shadow-2xs font-semibold border border-border'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Android</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ios')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'ios'
                  ? 'bg-surface text-ink shadow-2xs font-semibold border border-border'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <Apple className="w-3.5 h-3.5" />
              <span>iPhone / iPad</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('safari-mac')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'safari-mac'
                  ? 'bg-surface text-ink shadow-2xs font-semibold border border-border'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>Mac (Safari)</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-4 bg-bg/50 border border-border rounded-xl space-y-4">
          {activeTab === 'chrome-desktop' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 font-serif font-semibold text-sm text-ink">
                <Chrome className="w-4 h-4 text-accent" />
                <span>Google Chrome ou Microsoft Edge (Windows / Mac / Linux)</span>
              </div>
              <ol className="space-y-2.5 text-xs text-ink-muted list-decimal list-inside pl-1">
                <li className="leading-relaxed">
                  <strong className="text-ink">Opção 1 (Barra de Endereço):</strong> No topo da tela, no canto direito da barra de endereço (onde fica a URL), clique no ícone de <strong className="text-ink">Instalar</strong> ou <strong className="text-ink">Computador com seta</strong>.
                </li>
                <li className="leading-relaxed">
                  <strong className="text-ink">Opção 2 (Menu do Navegador):</strong> Clique no botão de <strong className="text-ink">três pontinhos (⋮)</strong> no canto superior direito do navegador.
                </li>
                <li className="leading-relaxed">
                  Selecione <strong className="text-ink">"Instalar FLOQT..."</strong> ou vá em <strong className="text-ink">"Salvar e compartilhar" &gt; "Instalar página como app"</strong>.
                </li>
                <li className="leading-relaxed">
                  Clique em <strong className="text-ink">Instalar</strong> na caixa de confirmação. O app abrirá em sua própria janela e terá um ícone na área de trabalho e barra de tarefas!
                </li>
              </ol>
            </div>
          )}

          {activeTab === 'android' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 font-serif font-semibold text-sm text-ink">
                <Smartphone className="w-4 h-4 text-accent" />
                <span>Android (Chrome / Samsung Internet / Brave)</span>
              </div>
              <ol className="space-y-2.5 text-xs text-ink-muted list-decimal list-inside pl-1">
                <li className="leading-relaxed">
                  Abra o FLOQT no navegador <strong className="text-ink">Google Chrome</strong> do seu celular.
                </li>
                <li className="leading-relaxed">
                  Toque no ícone de <strong className="text-ink">três pontinhos (⋮)</strong> no canto superior direito.
                </li>
                <li className="leading-relaxed">
                  Toque na opção <strong className="text-ink">"Instalar aplicativo"</strong> ou <strong className="text-ink">"Adicionar à tela inicial"</strong>.
                </li>
                <li className="leading-relaxed">
                  Confirme tocando em <strong className="text-ink">Instalar</strong>. O ícone do FLOQT aparecerá junto com seus outros aplicativos.
                </li>
              </ol>
            </div>
          )}

          {activeTab === 'ios' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 font-serif font-semibold text-sm text-ink">
                <Apple className="w-4 h-4 text-accent" />
                <span>iPhone e iPad (Safari)</span>
              </div>
              <ol className="space-y-3 text-xs text-ink-muted list-decimal list-inside pl-1">
                <li className="leading-relaxed">
                  Abra este site no aplicativo <strong className="text-ink">Safari</strong> da Apple.
                </li>
                <li className="leading-relaxed flex items-start gap-2">
                  <span>Toque no botão <strong className="text-ink">Compartilhar</strong> (o quadrado com uma seta apontando para cima <Share className="w-3.5 h-3.5 inline text-accent" />) na barra inferior.</span>
                </li>
                <li className="leading-relaxed flex items-start gap-2">
                  <span>Role as opções para baixo e toque em <strong className="text-ink">"Adicionar à Tela de Início"</strong> <PlusSquare className="w-3.5 h-3.5 inline text-accent" />.</span>
                </li>
                <li className="leading-relaxed">
                  Toque em <strong className="text-ink">"Adicionar"</strong> no canto superior direito. O FLOQT aparecerá na sua tela inicial como um app nativo de tela cheia.
                </li>
              </ol>
            </div>
          )}

          {activeTab === 'safari-mac' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 font-serif font-semibold text-sm text-ink">
                <Laptop className="w-4 h-4 text-accent" />
                <span>Mac (Safari no macOS Sonoma ou superior)</span>
              </div>
              <ol className="space-y-2.5 text-xs text-ink-muted list-decimal list-inside pl-1">
                <li className="leading-relaxed">
                  No menu superior do macOS com o Safari aberto, clique em <strong className="text-ink">Arquivo (File)</strong>.
                </li>
                <li className="leading-relaxed">
                  Selecione <strong className="text-ink">"Adicionar ao Dock..."</strong>.
                </li>
                <li className="leading-relaxed">
                  Clique em <strong className="text-ink">Adicionar</strong>. O FLOQT ficará acessível direto no Dock do seu Mac.
                </li>
              </ol>
            </div>
          )}
        </div>

        {/* Benefits reminder */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="p-3 bg-surface border border-border rounded-lg space-y-1">
            <p className="font-semibold text-ink flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-accent" />
              <span>100% Offline</span>
            </p>
            <p className="text-ink-muted text-[11px]">Acesse sua estante e crie destaques mesmo sem internet.</p>
          </div>
          <div className="p-3 bg-surface border border-border rounded-lg space-y-1">
            <p className="font-semibold text-ink flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5 text-accent" />
              <span>Tela Cheia</span>
            </p>
            <p className="text-ink-muted text-[11px]">Experiência limpa sem barras de navegação ou abas.</p>
          </div>
          <div className="p-3 bg-surface border border-border rounded-lg space-y-1">
            <p className="font-semibold text-ink flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-accent" />
              <span>Dados Locais</span>
            </p>
            <p className="text-ink-muted text-[11px]">Tudo armazenado de forma privada no seu dispositivo.</p>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="secondary" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
