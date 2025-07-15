"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { XIcon } from "lucide-react"
import { cn } from "@/lib/utils"

// Context pour gérer l'état ouvert/fermé du dialogue
const DialogContext = React.createContext<{
  open: boolean
  setOpen: (open: boolean) => void
}>({ open: false, setOpen: () => {} })

// Composant racine qui gère l'état
function Dialog({
  children,
  open,
  onOpenChange,
  ...props
}: {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
} & React.HTMLAttributes<HTMLDivElement>) {
  const [internalOpen, setInternalOpen] = React.useState(open || false)
  
  // Synchroniser l'état interne avec les props
  React.useEffect(() => {
    if (open !== undefined) {
      setInternalOpen(open)
    }
  }, [open])

  // Fonction pour mettre à jour l'état
  const handleOpenChange = React.useCallback((newOpen: boolean) => {
    setInternalOpen(newOpen)
    onOpenChange?.(newOpen)
  }, [onOpenChange])

  return (
    <DialogContext.Provider value={{ open: internalOpen, setOpen: handleOpenChange }}>
      <div {...props}>
        {children}
      </div>
    </DialogContext.Provider>
  )
}

// Déclencheur pour ouvrir le dialogue
function DialogTrigger({
  children,
  asChild,
  ...props
}: {
  children: React.ReactNode
  asChild?: boolean
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { setOpen } = React.useContext(DialogContext)
  
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      {...props}
    >
      {children}
    </button>
  )
}

// Portail pour rendre le dialogue dans le corps de la page
function DialogPortal({
  children,
  container,
  ...props
}: {
  children: React.ReactNode
  container?: HTMLElement
} & React.HTMLAttributes<HTMLDivElement>) {
  const [mounted, setMounted] = React.useState(false)
  const { open } = React.useContext(DialogContext)
  
  React.useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])
  
  if (!mounted || !open) return null
  
  return createPortal(
    <div {...props}>
      {children}
    </div>,
    container || document.body
  )
}

// Overlay (fond sombre) du dialogue avec bouton de fermeture en bas
interface DialogOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  showCloseButton?: boolean;
  closeButtonLabel?: string;
  onClose?: () => void;
  onCloseRequest?: () => void;
}

function DialogOverlay({
  className,
  showCloseButton = true,
  closeButtonLabel = "Fermer",
  onClose,
  onCloseRequest,
  ...props
}: DialogOverlayProps) {
  const { setOpen } = React.useContext(DialogContext);
  
  const handleClose = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
      if (onCloseRequest) {
        const shouldPreventClose = onCloseRequest();
        if (!shouldPreventClose) {
          if (onClose) {
            onClose();
          } else {
            setOpen(false);
          }
        }
      } else if (onClose) {
        onClose();
      } else {
        setOpen(false);
      }
  }, [onClose, setOpen, onCloseRequest]);

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm",
          className
        )}
        {...props}
      />
      {showCloseButton && (
        <button
          type="button"
          onClick={handleClose}
          className="fixed z-[51] top-[calc(50%+320px)] left-1/2 transform -translate-x-1/2 p-1.5 rounded-full bg-white/90 hover:bg-white text-gray-900 shadow-md hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 w-8 h-8 flex items-center justify-center group"
          aria-label="Fermer la modale"
        >
          <XIcon className="w-3.5 h-3.5 text-red-500 animate-ping absolute opacity-75" />
          <XIcon className="w-3.5 h-3.5 text-red-600 group-hover:scale-110 transition-transform duration-300" />
        </button>
      )}
    </>
  );
}

// Contenu principal du dialogue
const DialogContent = React.forwardRef<
  HTMLDivElement,
  {
    hideCloseButton?: boolean;
    className?: string;
    children: React.ReactNode;
    onCloseRequest?: () => boolean | void;
  } & Omit<React.HTMLAttributes<HTMLDivElement>, 'onCloseRequest'>
>(({ className, children, hideCloseButton, onCloseRequest, ...props }, ref) => {
  const { setOpen } = React.useContext(DialogContext)
  
  // Gérer la touche Escape
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const shouldPreventClose = onCloseRequest?.()
        if (shouldPreventClose !== false) {
          setOpen(false)
        }
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [setOpen, onCloseRequest])
  
  return (
    <DialogPortal>
      <DialogOverlay onCloseRequest={onCloseRequest} />
      <div
        ref={ref}
        role="dialog"
        className={cn(
          "fixed top-[50%] left-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg rounded-lg",
          "p-0",
          "sm:max-w-md md:max-w-lg",
          className
        )}
        onClick={(e) => e.stopPropagation()}
        {...props}
      >
        {children}
        
        {!hideCloseButton && (
          <button
            className="absolute top-4 right-4 rounded-lg opacity-70 hover:opacity-100 focus:outline-none disabled:pointer-events-none invisible"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          >
            <XIcon className="h-4 w-4" />
            <span className="hidden">Fermer</span>
          </button>
        )}
      </div>
    </DialogPortal>
  )
})

DialogContent.displayName = "DialogContent"

// En-tête du dialogue
function DialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}
      {...props}
    />
  )
}

// Pied de page du dialogue
function DialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
      {...props}
    />
  )
}

// Titre du dialogue
function DialogTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn("text-lg font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  )
}

// Description du dialogue
function DialogDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

// Bouton de fermeture du dialogue
function DialogClose({
  className,
  children,
  onClick,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { setOpen } = React.useContext(DialogContext)
  
  // Récupérer onCloseRequest du contexte parent
  const { onCloseRequest } = React.useContext(DialogContext) as any;
  
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (onClick) {
      onClick(e);
    } else if (onCloseRequest) {
      onCloseRequest();
    } else {
      setOpen(false);
    }
  };
  
  return (
    <button
      type="button"
      className={cn(className)}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  )
}

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogOverlay,
  DialogPortal,
}
