import React, { useRef } from 'react'
import { Animated, Dimensions, PanResponder, StyleSheet, TouchableOpacity, View } from 'react-native'
import { AntDesign } from '@expo/vector-icons'

const SCREEN_WIDTH = Dimensions.get('window').width
const DELETE_BUTTON_WIDTH = 72
const SNAP_BACK = 0.25
const AUTO_DELETE = 0.65

interface Props {
    onDelete: () => void
    children: React.ReactNode
}

const SwipeableRow = React.memo<Props>(({ onDelete, children }) => {
    const translateX = useRef(new Animated.Value(0)).current
    const isOpen = useRef(false)

    const springTo = (toValue: number, callback?: Animated.EndCallback) => {
        Animated.spring(translateX, {
            toValue,
            useNativeDriver: true,
            tension: 60,
            friction: 10,
        }).start(callback)
    }

    const deleteSelf = () => {
        Animated.timing(translateX, {
            toValue: -SCREEN_WIDTH,
            duration: 220,
            useNativeDriver: true,
        }).start(({ finished }) => {
            if (finished) onDelete()
        })
    }

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (_, { dx, dy }) =>
                Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy) * 1.5,
            onPanResponderTerminationRequest: () => false,

            onPanResponderGrant: () => {
                translateX.setOffset(isOpen.current ? -DELETE_BUTTON_WIDTH : 0)
                translateX.setValue(0)
            },

            onPanResponderMove: (_, { dx }) => {
                const maxRight = isOpen.current ? DELETE_BUTTON_WIDTH : 0
                translateX.setValue(Math.min(maxRight, Math.max(-SCREEN_WIDTH, dx)))
            },

            onPanResponderRelease: (_, { dx, vx }) => {
                translateX.flattenOffset()
                const absPos = Math.abs(isOpen.current ? -DELETE_BUTTON_WIDTH + dx : dx)
                const pct = absPos / SCREEN_WIDTH

                if (vx < -1.5 || pct >= AUTO_DELETE) {
                    isOpen.current = false
                    deleteSelf()
                } else if (pct >= SNAP_BACK) {
                    isOpen.current = true
                    springTo(-DELETE_BUTTON_WIDTH)
                } else {
                    isOpen.current = false
                    springTo(0)
                }
            },
        })
    ).current

    return (
        <View style={styles.wrapper}>
            <View style={styles.deleteBackground}>
                <TouchableOpacity onPress={deleteSelf} style={styles.deleteButton} activeOpacity={0.75}>
                    <AntDesign name="delete" size={20} color="white" />
                </TouchableOpacity>
            </View>
            <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
                {children}
            </Animated.View>
        </View>
    )
})

export default SwipeableRow

const styles = StyleSheet.create({
    wrapper: {
        overflow: 'hidden',
        borderRadius: 10,
    },
    deleteBackground: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#C62828',
        alignItems: 'flex-end',
        justifyContent: 'center',
        borderRadius: 10,
    },
    deleteButton: {
        width: DELETE_BUTTON_WIDTH,
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
    },
})
