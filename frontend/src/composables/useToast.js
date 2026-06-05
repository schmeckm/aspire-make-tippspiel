import { useToastStore } from '../stores/toastStore';

export function useToast() {
  const toastStore = useToastStore();

  return {
    show: toastStore.show,
    success: toastStore.success,
    error: toastStore.error,
    warning: toastStore.warning,
    info: toastStore.info,
    dismiss: toastStore.dismiss,
  };
}
