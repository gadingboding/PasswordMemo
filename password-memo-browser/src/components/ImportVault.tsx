import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Upload, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogFooter } from '@/components/ui/Dialog';
import { useToastContext } from '../contexts/ToastContext';
import { PasswordManager } from 'password-memo-core';

export const ImportVault: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToastContext();
  // Using PasswordManager directly from password-memo-core
  
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleSelectFileClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleClickOpen = () => {
    setOpen(true);
    setError(null);
    setSelectedFile(null);
  };

  const handleClose = () => {
    setOpen(false);
    setError(null);
    setSelectedFile(null);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      // Check file extension
      if (!file.name.endsWith('.json')) {
        setError(t('import.error.invalidFileFormat'));
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const content = await selectedFile.text();
      const manager = PasswordManager.getInstance();
      await manager.importVault(content);
      
      // Show success message
      showSuccess(t('import.success'));
      
      // Close dialog and navigate back to login page
      handleClose();
      
      // Wait a moment to show success message before navigating
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (err) {
      console.error('Failed to import vault:', err);
      setError(t('import.error.failed'));
      showError(t('import.error.failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={handleClickOpen}
        className="border-slate-600 text-slate-300 hover:bg-slate-700"
      >
        <Upload className="h-4 w-4 mr-2" />
        {t('import.button')}
      </Button>

      {/* Import Confirmation Dialog */}
      <Dialog open={open} onClose={handleClose} title={t('import.confirm.title')}>
        <div className="space-y-4">
          <p className="text-slate-300">
            {t('import.description')}
          </p>
          
          <input
            ref={fileInputRef}
            accept=".json"
            className="hidden"
            type="file"
            onChange={handleFileChange}
          />
          <Button 
            variant="default" 
            onClick={handleSelectFileClick}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {t('import.selectFile')}
          </Button>
          
          {selectedFile && (
            <div className="mt-4 p-3 bg-slate-700 rounded-lg">
              <p className="text-slate-400 text-sm">
                {t('import.selectedFile')}: {selectedFile.name}
              </p>
            </div>
          )}
          
          {error && (
            <div className="mt-4 p-3 bg-red-900/30 border border-red-700 rounded-lg flex items-start">
              <AlertCircle className="h-5 w-5 mr-2 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-300 text-sm">
                {error}
              </p>
            </div>
          )}
          
          <div className="mt-4 p-4 border border-red-600 rounded-lg bg-red-900/20">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 mr-2 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-300 text-sm">
                {t('import.confirm.warning')}
              </p>
            </div>
            <p className="text-slate-300 text-sm mt-2">
              {t('import.confirm.description')}
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={handleClose}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleImport}
            variant="destructive"
            disabled={!selectedFile || !!error || loading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {t('common.loading')}
              </>
            ) : (
              t('import.confirm.proceed')
            )}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
};
