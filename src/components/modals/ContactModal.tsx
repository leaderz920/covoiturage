import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose
} from "@/components/ui/dialog-simple";
import { Button } from "@/components/ui/button";

interface ContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phoneNumber: string;
}

export function ContactModal({ open, onOpenChange, phoneNumber }: ContactModalProps) {
  // Formater le numéro pour les liens
  const formattedNumber = phoneNumber.replace(/\s+/g, '');
  
  // Créer le lien WhatsApp
  const whatsappLink = `https://wa.me/${formattedNumber}`;
  
  // Créer le lien pour appeler
  const callLink = `tel:${formattedNumber}`;
  
  // Générer un ID unique pour l'accessibilité
  const titleId = React.useId();
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="w-[90vw] max-w-[90vw] sm:max-w-md border-0 shadow-xl rounded-xl overflow-hidden p-0 max-h-[90vh] overflow-y-auto modal-content"
        aria-labelledby={titleId}
      >
        {/* En-tête avec dégradé */}
        <div className="relative py-3 px-6" style={{ background: 'linear-gradient(135deg, #00D4FF 0%, #7570FF 100%)' }}>
          <DialogClose className="absolute right-3 top-3 bg-white/20 text-white hover:bg-white/30 rounded-full p-1" />
          <div className="flex items-center">
            <DialogClose className="mr-2 text-white hover:bg-white/20 rounded-full p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </DialogClose>
            <div className="bg-white rounded-full w-8 h-8 flex items-center justify-center shadow-md mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="w-4 h-4" style={{ fill: '#7570FF' }}>
                <path d="M497.39 361.8l-112-48a24 24 0 0 0-28 6.9l-49.6 60.6A370.66 370.66 0 0 1 130.6 204.11l60.6-49.6a23.94 23.94 0 0 0 6.9-28l-48-112A24.16 24.16 0 0 0 122.6.61l-104 24A24 24 0 0 0 0 48c0 256.5 207.9 464 464 464a24 24 0 0 0 23.4-18.6l24-104a24.29 24.29 0 0 0-14.01-27.6z"/>
              </svg>
            </div>
            <div>
              <DialogTitle id={titleId} className="text-base font-bold text-white leading-tight">Contacter</DialogTitle>
              <p className="text-blue-50 text-xs">Choisissez votre méthode de contact</p>
            </div>
          </div>
        </div>
        
        {/* Contenu */}
        <div className="overflow-y-auto scrollbar-hide max-h-[calc(90vh-56px)] p-6">
          <div className="bg-blue-50 p-3 rounded-xl mb-4 border border-blue-100">
            <div className="flex items-center">
              <div className="bg-blue-100 rounded-full p-1.5 mr-2">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <div className="text-sm font-medium text-blue-600">{phoneNumber}</div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-4">
            <Button
              onClick={() => window.open(whatsappLink, '_blank')}
              className="group relative flex items-center justify-center gap-2 py-6 overflow-hidden rounded-xl bg-gradient-to-r from-green-400 to-green-600 text-white shadow-lg hover:shadow-green-200 hover:shadow-xl"
            >
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10"></div>
              <svg aria-hidden="true" className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004A9.87 9.87 0 017.021 20.41l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.511-5.26c.001-5.45 4.436-9.884 9.889-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              <span>WhatsApp</span>
            </Button>
            <Button
              onClick={() => window.location.href = callLink}
              className="group relative flex items-center justify-center gap-2 py-6 overflow-hidden rounded-xl bg-gradient-to-r from-blue-400 to-blue-600 text-white shadow-lg hover:shadow-blue-200 hover:shadow-xl"
            >
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10"></div>
              <svg aria-hidden="true" className="w-5 h-5" fill="currentColor" viewBox="0 0 512 512">
                <path d="M493.4 24.6l-104-24c-11.3-2.6-22.9 3.3-27.5 13.9l-48 112c-4.2 9.8-1.4 21.3 6.9 28l60.6 49.6c-36 76.7-98.9 140.5-177.2 177.2l-49.6-60.6c-6.8-8.3-18.2-11.1-28-6.9l-112 48C3.9 366.5-2 378.1.6 389.4l24 104C27.1 504.2 36.7 512 48 512c256.1 0 464-207.5 464-464 0-11.2-7.7-20.9-18.6-23.4z"/>
              </svg>
              <span>Appeler</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
