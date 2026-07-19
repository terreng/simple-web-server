import React, {createContext, useCallback, useContext, useState} from 'react';
import {Modal, Pressable, StyleSheet, Text, View} from 'react-native';
import {useTheme} from '../theme/ThemeContext';
import {fontFamily} from '../theme/theme';
import {RichText} from './RichText';
import {Button, type ButtonVariant} from './controls';

export interface PromptButton {
  label: string;
  variant?: ButtonVariant;
  onPress: () => void;
}

interface PromptSpec {
  title?: string;
  /** HTML subset (see RichText). */
  body: string;
  buttons: PromptButton[];
}

interface PromptContextValue {
  show: (spec: PromptSpec) => void;
  hide: () => void;
}

const PromptContext = createContext<PromptContextValue>({
  show: () => {},
  hide: () => {},
});

export function PromptProvider({children}: {children: React.ReactNode}) {
  const {colors} = useTheme();
  const [spec, setSpec] = useState<PromptSpec | null>(null);

  const show = useCallback((s: PromptSpec) => setSpec(s), []);
  const hide = useCallback(() => setSpec(null), []);

  return (
    <PromptContext.Provider value={{show, hide}}>
      {children}
      <Modal
        visible={spec !== null}
        transparent
        animationType="fade"
        onRequestClose={hide}>
        <Pressable style={styles.backdrop} onPress={hide}>
          <Pressable
            style={[styles.card, {backgroundColor: colors.elevated}]}
            onPress={() => {}}>
            {spec?.title ? (
              <Text style={[styles.title, {color: colors.textPrimary, fontFamily}]}>
                {spec.title}
              </Text>
            ) : null}
            {spec ? <RichText html={spec.body} /> : null}
            <View style={styles.actions}>
              {spec?.buttons.map((b, i) => (
                <Button
                  key={i}
                  title={b.label}
                  variant={b.variant}
                  onPress={b.onPress}
                  style={styles.action}
                />
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </PromptContext.Provider>
  );
}

export function usePrompt(): PromptContextValue {
  return useContext(PromptContext);
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: {width: 0, height: 8},
  },
  title: {fontSize: 18, fontWeight: '600', marginBottom: 10},
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 18,
  },
  action: {marginLeft: 10},
});
