import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Branch } from '@/types';
import { branchService } from '@/services/branch.service';

interface BranchContextType {
  branches: Branch[];
  selectedBranchId: string | null;
  isLoading: boolean;
  selectBranch: (branchId: string | null) => void;
  refreshBranches: () => Promise<void>;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export const BranchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    refreshBranches();
  }, []);

  const refreshBranches = async () => {
    try {
      setIsLoading(true);
      const data = await branchService.list();
      setBranches(data);
      if (data.length > 0 && !selectedBranchId) {
        setSelectedBranchId(data[0].id);
      }
    } catch (error) {
      console.error('Error loading branches:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectBranch = (branchId: string | null) => {
    setSelectedBranchId(branchId);
  };

  return (
    <BranchContext.Provider
      value={{
        branches,
        selectedBranchId,
        isLoading,
        selectBranch,
        refreshBranches,
      }}
    >
      {children}
    </BranchContext.Provider>
  );
};

export const useBranch = () => {
  const context = useContext(BranchContext);
  if (context === undefined) {
    throw new Error('useBranch must be used within a BranchProvider');
  }
  return context;
};
