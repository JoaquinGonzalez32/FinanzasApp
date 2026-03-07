import { View, Text, TextInput } from 'react-native';

const Input = ({
    label,
    value,
    onChangeText,
    placeholder,
    keyboardType,
    maxLength,
    editable = true,
    multiline = false,
    prefix,
    className: extraClass = '',
    inputClassName = '',
    ...rest
}) => {
    return (
        <View className={extraClass}>
            {label && (
                <Text className="text-xs font-semibold text-stone-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    {label}
                </Text>
            )}
            <View className={`flex-row items-center bg-frost dark:bg-input-dark rounded-xl px-4 border border-primary/8 dark:border-transparent ${multiline ? 'py-3' : 'h-12'}`}>
                {prefix && (
                    <Text className="text-sm font-semibold text-stone-400 dark:text-slate-500 mr-2">
                        {prefix}
                    </Text>
                )}
                <TextInput
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor="#a8a29e"
                    keyboardType={keyboardType}
                    maxLength={maxLength}
                    editable={editable}
                    multiline={multiline}
                    className={`flex-1 text-sm font-medium text-stone-900 dark:text-white ${inputClassName}`}
                    {...rest}
                />
            </View>
        </View>
    );
};

export default Input;
