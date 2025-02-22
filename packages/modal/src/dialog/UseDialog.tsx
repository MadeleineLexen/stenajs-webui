import cx from "classnames";
import React, {
  CSSProperties,
  MouseEventHandler,
  ReactNode,
  RefObject,
  useCallback,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { RejectCommand, ResolveCommand, ShowCommand } from "./DialogCommands";
import { DialogContext, DialogContextValue } from "./DialogContext";
import { Modal } from "../declarative-modals/modal/Modal";

type UseDialogCallbacks<TProps, TPromiseResolve> = {
  show: ShowCommand<TProps, TPromiseResolve>;
  reject: RejectCommand;
};

export type UseDialogResult<TProps, TPromiseResolve> = [
  ReactNode,
  UseDialogCallbacks<TProps, TPromiseResolve>,
];

export interface DialogOptions {
  divInsteadOfDialog?: boolean;
  background?: string;
  disableCloseOnClickOutside?: boolean;
  modal: boolean;
  className: string;
  closingClassName: string;
  contentWrapperClassName: string;
  contentWrapperStyle?: CSSProperties;
  dialogStyle?: CSSProperties;
  ref?: RefObject<HTMLDialogElement>;
  onResolve?: () => void;
  onReject?: () => void;
}

export function useDialog<TProps, TPromiseResolve = void>(
  component: React.FC<TProps>,
  {
    ref,
    modal,
    contentWrapperClassName,
    closingClassName,
    contentWrapperStyle,
    dialogStyle,
    divInsteadOfDialog,
    disableCloseOnClickOutside,
    onResolve,
    onReject,
    className,
    background,
  }: DialogOptions,
): UseDialogResult<TProps, TPromiseResolve> {
  const localRef = useRef<HTMLDialogElement>(null);
  const currentRef = ref ?? localRef;
  const [key, forceRerender] = useReducer((x) => x + 1, 0);
  const promiseRef = useRef<Promise<TPromiseResolve | undefined>>();
  const resolveRef = useRef<ResolveCommand<TPromiseResolve> | undefined>();
  const modalComponentProps = useRef<TProps>();
  const rejectRef = useRef<RejectCommand | undefined>();
  const [contentVisible, setContentVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  const Comp = component;

  const show = useCallback<ShowCommand<TProps, TPromiseResolve>>(
    (props?: TProps) => {
      promiseRef.current = new Promise<TPromiseResolve | undefined>(
        (resolve, reject) => {
          resolveRef.current = resolve;
          rejectRef.current = reject;
        },
      );
      setClosing(false);
      setContentVisible(true);
      forceRerender();
      modalComponentProps.current = props;
      if (modal) {
        currentRef.current?.showModal();
      } else {
        currentRef.current?.show();
      }
      return promiseRef.current;
    },
    [currentRef, modal],
  );

  const resolve = useCallback<ResolveCommand<TPromiseResolve>>(
    (value) => {
      // Trigger closing animation.
      setClosing(true);
      if (!divInsteadOfDialog) {
        currentRef.current?.addEventListener(
          "animationend",
          () => {
            setClosing(false);
            setContentVisible(false);
            currentRef.current?.close();
            resolveRef.current?.(value);
            modalComponentProps.current = undefined;
            onResolve?.();
          },
          { once: true },
        );
      } else {
        setClosing(false);
        setContentVisible(false);
        resolveRef.current?.(value);
        modalComponentProps.current = undefined;
        onResolve?.();
      }
    },
    [currentRef, onResolve, divInsteadOfDialog],
  );

  const onClose = useCallback(() => {
    // Remove content immediately, since it cannot be animated when closed by browser.
    setClosing(false);
    setContentVisible(false);
    rejectRef.current?.();
    onReject?.();
    modalComponentProps.current = undefined;
  }, [onReject]);

  const reject = useCallback<RejectCommand>(
    (error) => {
      // Trigger closing animation.
      setClosing(true);
      if (!divInsteadOfDialog) {
        currentRef.current?.addEventListener(
          "animationend",
          () => {
            setClosing(false);
            setContentVisible(false);
            currentRef.current?.close();
            rejectRef.current?.(error);
            onReject?.();
            modalComponentProps.current = undefined;
          },
          { once: true },
        );
      } else {
        setClosing(false);
        setContentVisible(false);
        rejectRef.current?.(error);
        onReject?.();
        modalComponentProps.current = undefined;
      }
    },
    [currentRef, divInsteadOfDialog, onReject],
  );

  const onClick = useCallback<MouseEventHandler<HTMLDialogElement>>(
    (e) => {
      if (e.target !== currentRef.current) {
        return;
      }

      const rect = currentRef.current.getBoundingClientRect();

      const clickedInsideDialog =
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width;

      if (!clickedInsideDialog) {
        reject();
      }
    },
    [currentRef, reject],
  );

  const contextValue = useMemo(
    () => ({ resolve, reject }) as DialogContextValue<unknown>,
    [reject, resolve],
  );

  const element = useMemo<ReactNode>(
    () =>
      divInsteadOfDialog ? (
        <Modal
          isOpen={contentVisible}
          onRequestClose={reject}
          background={background}
        >
          <DialogContext.Provider value={contextValue}>
            <div
              style={contentWrapperStyle}
              className={contentWrapperClassName}
            >
              {contentVisible && (
                <Comp {...(modalComponentProps.current as TProps)} key={key} />
              )}
            </div>
          </DialogContext.Provider>
        </Modal>
      ) : (
        <dialog
          onClick={disableCloseOnClickOutside ? undefined : onClick}
          onClose={onClose}
          ref={currentRef}
          className={cx(className, closing && closingClassName)}
          style={{ background: background, ...dialogStyle }}
        >
          <div style={contentWrapperStyle} className={contentWrapperClassName}>
            {contentVisible && (
              <DialogContext.Provider value={contextValue}>
                <Comp {...(modalComponentProps.current as TProps)} key={key} />
              </DialogContext.Provider>
            )}
          </div>
        </dialog>
      ),
    [
      divInsteadOfDialog,
      background,
      contentWrapperStyle,
      contentWrapperClassName,
      disableCloseOnClickOutside,
      className,
      closingClassName,
      dialogStyle,
      contentVisible,
      reject,
      contextValue,
      Comp,
      key,
      onClick,
      onClose,
      currentRef,
      closing,
    ],
  );

  return [element, { show, reject }];
}
