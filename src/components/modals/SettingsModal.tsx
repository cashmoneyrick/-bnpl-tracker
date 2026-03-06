import { Modal } from '../shared/Modal';
import { useBNPLStore } from '../../store';
import { SettingsPage } from '../../pages/SettingsPage';

export function SettingsModal() {
  const isOpen = useBNPLStore((state) => state.settingsModalOpen);
  const closeModal = useBNPLStore((state) => state.closeSettingsModal);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={closeModal} title="Settings" size="2xl">
      <SettingsPage />
    </Modal>
  );
}
