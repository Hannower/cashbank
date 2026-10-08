import React from 'react';
import { Modal } from './Modal';
import { Trash2 } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  itemDescription?: string;
  loading?: boolean;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemDescription,
  loading = false,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle="Esta ação não pode ser desfeita."
      icon={<Trash2 size={22} color="#dc2626" />}
      maxWidth="440px"
    >
      <div style={{ marginTop: 8 }}>
        <p style={{ color: '#475569', fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
          Tem certeza de que deseja excluir permanentemente o registro{' '}
          <strong>{itemDescription || 'selecionado'}</strong>?
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            style={{
              backgroundColor: '#dc2626',
              color: 'white',
              padding: '10px 20px',
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 14,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 2px 4px rgba(220, 38, 38, 0.25)',
            }}
          >
            {loading ? 'Excluindo...' : 'Excluir definitivamente'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
