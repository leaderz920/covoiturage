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
      <div data-slot="dialog" {...props}>
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
      data-slot="dialog-trigger"
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
    <div data-slot="dialog-portal" {...props}>
      {children}
    </div>,
    container || document.body
  )
}

// Overlay (fond sombre) du dialogue avec bouton de fermeture en bas
function DialogOverlay({
  className,
  showCloseButton = true,
  closeButtonLabel = "Fermer",
  onClose,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  showCloseButton?: boolean;
  closeButtonLabel?: string;
  onClose?: () => void;
}) {
  const { setOpen } = React.useContext(DialogContext);
  
    const handleClose = React.useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      if (onClose) {
        onClose();
      } else {
        setOpen(false);
      }
    }, [onClose, setOpen]);

  return (
    <>
      <div
        data-slot="dialog-overlay"
        className={cn(
          "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          className
        )}
        onClick={handleClose}
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
    children: React.ReactNode
    hideCloseButton?: boolean
  } & React.HTMLAttributes<HTMLDivElement>
>(({ className, children, hideCloseButton = false, ...props }, ref) => {
  const { setOpen } = React.useContext(DialogContext)
  
  // Gérer la touche Escape
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [setOpen])
  
  return (
    <DialogPortal>
      <DialogOverlay onClick={() => setOpen(false)} />
      <div
        ref={ref}
        role="dialog"
        data-slot="dialog-content"
        className={cn(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-1rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border shadow-lg duration-200 dialog-content",
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
            className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:not([class*='size-'])]:size-4"
            onClick={() => setOpen(false)}
          >
            <XIcon className="w-4 h-4" />
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
      data-slot="dialog-header"
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
      data-slot="dialog-footer"
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
      data-slot="dialog-title"
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
      data-slot="dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

// Bouton de fermeture du dialogue
function DialogClose({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { setOpen } = React.useContext(DialogContext)
  
  return (
    <button
      data-slot="dialog-close"
      className={cn(className)}
      onClick={() => setOpen(false)}
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
