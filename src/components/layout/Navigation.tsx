import React, { useState } from 'react';
import Link from 'next/link';

export function Navigation() {
  const [activeTab, setActiveTab] = useState<string | null>(null);

  return (
    <div className="fixed bottom-0 w-full bg-white border-t border-gray-200 shadow-lg z-10">
      <div className="grid grid-cols-4 h-16">
        <Link
          href="/"
          className={`flex flex-col items-center justify-center cursor-pointer transition-colors duration-200 active:scale-95 ${
            activeTab === null ? 'text-blue-500 bg-blue-50' : 'text-gray-500 hover:text-blue-500 hover:bg-blue-50'
          }`}
          onClick={() => setActiveTab(null)}
        >
          <i className="fas fa-home text-xl mb-0.5"></i>
          <span className="text-xs font-medium">Accueil</span>
        </Link>
        <Link
          href="/search"
          className={`flex flex-col items-center justify-center cursor-pointer transition-all duration-200 active:scale-95 ${
            activeTab === 'search' ? 'text-blue-500 bg-blue-50' : 'text-gray-500 hover:text-blue-500 hover:bg-blue-50'
          }`}
          onClick={() => setActiveTab('search')}
        >
          <i className="fas fa-search text-xl"></i>
          <span className="text-xs mt-1">Recherche</span>
        </Link>
        <Link
          href="/publish"
          className={`flex flex-col items-center justify-center cursor-pointer transition-all duration-200 active:scale-95 ${
            activeTab === 'publish' ? 'text-blue-500 bg-blue-50' : 'text-gray-500 hover:text-blue-500 hover:bg-blue-50'
          }`}
          onClick={() => setActiveTab('publish')}
        >
          <i className="fas fa-plus-circle text-xl"></i>
          <span className="text-xs mt-1">Publier</span>
        </Link>
        <Link
          href="/profile"
          className={`flex flex-col items-center justify-center cursor-pointer transition-all duration-200 active:scale-95 ${
            activeTab === 'profile' ? 'text-blue-500 bg-blue-50' : 'text-gray-500 hover:text-blue-500 hover:bg-blue-50'
          }`}
          onClick={() => setActiveTab('profile')}
        >
          <i className="fas fa-user text-xl"></i>
          <span className="text-xs mt-1">Profil</span>
        </Link>
      </div>
    </div>
  );
}
