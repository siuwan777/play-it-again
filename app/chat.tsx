import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation, useRouter, useFocusEffect } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import {
  canConfirmMeetup,
  canConfirmSale,
  canExpressBuyInterest,
  canProposeMeetup,
  confirmMeetup,
  confirmSaleToBuyer,
  expressBuyInterest,
  formatMessageTime,
  getDealStatusLabel,
  getMeetupStatusLabel,
  getOtherPartyId,
  getOtherPartyName,
  markConversationRead,
  proposeMeetup,
  sendMessage,
  subscribeConversation,
  subscribeMessages,
  type ChatMessage,
  type Conversation,
} from '../utils/chat';
import { getChatQuickReplies } from '../utils/chatTemplates';
import { TRADE_POLICY_SHORT } from '../utils/tradePolicy';
import { TradePolicyNote } from '../components/TradePolicyNote';
import { getExistingRating } from '../utils/transactionRating';
import { useBlockedUserIds } from '../hooks/useBlockedUserIds';
import { colors } from '../constants/theme';

const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1550291652-6ea9114a47b1?q=80&w=800&auto=format&fit=crop';

const MEETUP_TIME_OPTIONS = ['今天下午', '明天下午', '週末'];
const MEETUP_PLACE_OPTIONS = ['旺角', '銅鑼灣', '深水埗'];

/** 頂部狀態列已說明時，不再重複顯示購買意願卡片；並只保留最後一則 buy_intent */
function getVisibleChatMessages(messages: ChatMessage[], dealStatus: Conversation['dealStatus']): ChatMessage[] {
  const hideBuyIntent = dealStatus === 'buyer_interested' || dealStatus === 'sold';
  let lastBuyIntentId: string | null = null;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].type === 'buy_intent') {
      lastBuyIntentId = messages[i].id;
      break;
    }
  }
  return messages.filter((msg) => {
    if (msg.type !== 'buy_intent') return true;
    if (hideBuyIntent) return false;
    return !lastBuyIntentId || msg.id === lastBuyIntentId;
  });
}

export default function Chat() {
  const router = useRouter();
  const navigation = useNavigation();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const scrollViewRef = useRef<ScrollView>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [expressingInterest, setExpressingInterest] = useState(false);
  const [confirmingSale, setConfirmingSale] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const [inputText, setInputText] = useState('');
  const [showMeetupModal, setShowMeetupModal] = useState(false);
  const [meetupTime, setMeetupTime] = useState(MEETUP_TIME_OPTIONS[0]);
  const [meetupPlace, setMeetupPlace] = useState(MEETUP_PLACE_OPTIONS[0]);
  const [meetupTimeCustom, setMeetupTimeCustom] = useState('');
  const [meetupPlaceCustom, setMeetupPlaceCustom] = useState('');
  const [proposingMeetup, setProposingMeetup] = useState(false);
  const [confirmingMeetup, setConfirmingMeetup] = useState(false);
  const { blockedUserIds } = useBlockedUserIds();

  const visibleMessages = useMemo(
    () => getVisibleChatMessages(messages, conversation?.dealStatus ?? 'chatting'),
    [messages, conversation?.dealStatus]
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid ?? null);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!conversationId || !userId) {
      if (!conversationId) setLoading(false);
      return;
    }

    setLoading(true);
    let loadedConversation = false;
    let loadedMessages = false;

    const markLoaded = () => {
      if (loadedConversation && loadedMessages) {
        setLoading(false);
      }
    };

    const unsubscribeConversation = subscribeConversation(
      conversationId,
      (data) => {
        if (!data || !data.participants.includes(userId)) {
          setConversation(null);
          setLoading(false);
          return;
        }
        setConversation(data);
        loadedConversation = true;
        markLoaded();
      },
      (error) => {
        console.error('Failed to load conversation:', error);
        setLoading(false);
      }
    );

    const unsubscribeMessages = subscribeMessages(
      conversationId,
      (items) => {
        setMessages(items);
        loadedMessages = true;
        markLoaded();
      },
      (error) => {
        console.error('Failed to load messages:', error);
        setLoading(false);
      }
    );

    return () => {
      unsubscribeConversation();
      unsubscribeMessages();
    };
  }, [conversationId, userId]);

  useLayoutEffect(() => {
    if (!conversation || !userId) {
      navigation.setOptions({ title: '對話', headerRight: undefined });
      return;
    }

    const otherPartyName = getOtherPartyName(conversation, userId);
    const otherUserId = getOtherPartyId(conversation, userId);

    navigation.setOptions({
      title: `與 ${otherPartyName} 對話`,
      headerRight: otherUserId
        ? () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: '/seller-profile',
                    params: {
                      sellerId: otherUserId,
                      listingId: conversation.listingId,
                      sellerName: otherPartyName,
                    },
                  })
                }
                style={{ paddingHorizontal: 10 }}
                accessibilityLabel="查看對方檔案"
              >
                <Ionicons name="person-circle-outline" size={24} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: '/report',
                    params: {
                      userId: otherUserId,
                      userName: otherPartyName,
                      listingId: conversation.listingId,
                      conversationId: conversation.id,
                    },
                  })
                }
                style={{ paddingHorizontal: 10 }}
                accessibilityLabel="檢舉"
              >
                <Ionicons name="flag-outline" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
          )
        : undefined,
    });
  }, [conversation, userId, navigation, router]);

  useEffect(() => {
    if (!conversationId || !userId || loading || !conversation) return;

    markConversationRead(conversationId, userId).catch((error) => {
      console.error('Failed to mark conversation read:', error);
    });
  }, [conversationId, userId, loading, conversation, messages.length]);

  useEffect(() => {
    if (!conversation || !userId || conversation.dealStatus !== 'sold') {
      setHasRated(false);
      return;
    }

    getExistingRating(conversation.listingId, userId)
      .then((existing) => setHasRated(!!existing))
      .catch((error) => {
        console.error('Failed to check existing rating:', error);
        setHasRated(false);
      });
  }, [conversation?.listingId, conversation?.dealStatus, userId]);

  useFocusEffect(
    useCallback(() => {
      if (!conversation || !userId || conversation.dealStatus !== 'sold') return;

      getExistingRating(conversation.listingId, userId)
        .then((existing) => setHasRated(!!existing))
        .catch((error) => console.error('Failed to check existing rating:', error));
    }, [conversation, userId])
  );

  const handleSend = async () => {
    if (!conversationId || !userId || !inputText.trim() || sending) return;

    setSending(true);
    const text = inputText.trim();
    setInputText('');

    try {
      await sendMessage(conversationId, userId, text);
    } catch (error) {
      console.error('Failed to send message:', error);
      setInputText(text);
      const message =
        error instanceof Error && error.message.includes('無法與此用戶傳送訊息')
          ? '你已封鎖此用戶，或對方已封鎖你，無法傳送訊息。'
          : '訊息無法送出，請稍後再試。';
      Alert.alert('傳送失敗', message);
    } finally {
      setSending(false);
    }
  };

  const handleQuickReply = (text: string) => {
    setInputText(text);
  };

  const handleProposeMeetup = async () => {
    if (!conversationId || !userId || proposingMeetup) return;

    const time = meetupTimeCustom.trim() || meetupTime;
    const place = meetupPlaceCustom.trim() || meetupPlace;

    if (!time || !place) {
      Alert.alert('請填寫交收資訊', '請選擇或輸入時間與地點。');
      return;
    }

    setProposingMeetup(true);
    try {
      await proposeMeetup(conversationId, userId, {
        method: '面交',
        time,
        place,
      });
      setShowMeetupModal(false);
      setMeetupTimeCustom('');
      setMeetupPlaceCustom('');
      Alert.alert('已送出', '交收提議已發送，等待對方確認。');
    } catch (error: any) {
      Alert.alert('無法送出', error.message || '請稍後再試。');
    } finally {
      setProposingMeetup(false);
    }
  };

  const handleConfirmMeetup = () => {
    if (!conversationId || !userId || confirmingMeetup) return;

    Alert.alert('確認交收安排', '確定同意這個交收時間與地點嗎？', [
      { text: '取消', style: 'cancel' },
      {
        text: '確認',
        onPress: async () => {
          setConfirmingMeetup(true);
          try {
            await confirmMeetup(conversationId, userId);
            Alert.alert('已確認', '交收安排已確認，祝交收順利！');
          } catch (error: any) {
            Alert.alert('無法確認', error.message || '請稍後再試。');
          } finally {
            setConfirmingMeetup(false);
          }
        },
      },
    ]);
  };

  const handleBuyIntent = async () => {
    if (!conversationId || !userId || !conversation || expressingInterest) return;

    setExpressingInterest(true);
    try {
      await expressBuyInterest(conversationId, userId);
      Alert.alert('已送出', '賣家已收到你的購買意願，請耐心等候回覆。');
    } catch (error: any) {
      Alert.alert('無法送出', error.message || '請稍後再試。');
    } finally {
      setExpressingInterest(false);
    }
  };

  const handleConfirmSale = () => {
    if (!conversationId || !userId || !conversation || confirmingSale) return;

    Alert.alert(
      '確認售予此買家',
      `確定將「${conversation.listingTitle}」售予 ${conversation.buyerName} 嗎？\n\n商品將從市集下架，買家會收到評價通知。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '確認售出',
          onPress: async () => {
            setConfirmingSale(true);
            try {
              await confirmSaleToBuyer(conversationId, userId);
              Alert.alert('交易已確認', '商品已下架，買家已收到通知。', [
                { text: '稍後再評', style: 'cancel' },
                {
                  text: '為買家評分',
                  onPress: () =>
                    router.push({
                      pathname: '/rate',
                      params: {
                        listingId: conversation.listingId,
                        listingTitle: conversation.listingTitle,
                        revieweeId: conversation.buyerId,
                        revieweeName: conversation.buyerName,
                      },
                    }),
                },
              ]);
            } catch (error: any) {
              Alert.alert('無法確認', error.message || '請稍後再試。');
            } finally {
              setConfirmingSale(false);
            }
          },
        },
      ]
    );
  };

  if (!conversationId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>找不到對話</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>返回</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!userId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>請先登入</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.push('/login')}>
          <Text style={styles.backBtnText}>前往登入</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.tile} />
        <Text style={styles.loadingText}>載入對話中...</Text>
      </View>
    );
  }

  if (!conversation) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>無法讀取此對話</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>返回</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const otherPartyName = getOtherPartyName(conversation, userId);
  const otherUserId = getOtherPartyId(conversation, userId);
  const isBlocked = otherUserId ? blockedUserIds.has(otherUserId) : false;
  const isBuyer = userId === conversation.buyerId;
  const isSold = conversation.dealStatus === 'sold';
  const showBuyButton = isBuyer && canExpressBuyInterest(conversation, userId);
  const showConfirmSaleButton = !isBuyer && canConfirmSale(conversation, userId);
  const quickReplies = getChatQuickReplies(isBuyer);
  const showRateButton = isSold && !hasRated;
  const rateRevieweeId = isBuyer ? conversation.sellerId : conversation.buyerId;
  const rateRevieweeName = isBuyer ? conversation.sellerName : conversation.buyerName;
  const rateButtonLabel = isBuyer ? '為賣家評分' : '為買家評分';
  const meetupStatusLabel = getMeetupStatusLabel(conversation, userId);
  const showProposeMeetupButton = canProposeMeetup(conversation, userId);
  const showConfirmMeetupButton = canConfirmMeetup(conversation, userId);
  const dealStatusLabel = getDealStatusLabel(conversation.dealStatus, isBuyer);
  const showActionPanel =
    !isBlocked &&
    (showBuyButton ||
      showProposeMeetupButton ||
      showConfirmMeetupButton ||
      showConfirmSaleButton ||
      showRateButton ||
      (isSold && hasRated));

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.itemHeader}>
        <Image
          source={{ uri: conversation.listingImage || DEFAULT_IMAGE }}
          style={styles.itemImage}
        />
        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle} numberOfLines={1}>
            {conversation.listingTitle}
          </Text>
          <Text style={styles.itemPrice}>HK$ {conversation.listingPrice}</Text>
          <Text style={styles.dealStatusText}>{dealStatusLabel}</Text>
          {meetupStatusLabel ? (
            <Text style={styles.meetupStatusInline}>{meetupStatusLabel}</Text>
          ) : null}
        </View>
      </View>
      {otherUserId ? (
        <TouchableOpacity
          style={styles.sellerProfileLink}
          onPress={() =>
            router.push({
              pathname: '/seller-profile',
              params: {
                sellerId: otherUserId,
                listingId: conversation.listingId,
                sellerName: otherPartyName,
              },
            })
          }
        >
          <Text style={styles.sellerProfileLinkText}>查看 {otherPartyName} 的放售人檔案</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      ) : null}

      <TradePolicyNote variant="compact" />

      {isBlocked && (
        <View style={styles.blockedBanner}>
          <Text style={styles.blockedBannerText}>
            你已封鎖此用戶，或對方已封鎖你，無法繼續傳送訊息。
          </Text>
        </View>
      )}

      {showActionPanel && (
        <View style={styles.actionPanel}>
          {showBuyButton && (
            <TouchableOpacity
              style={[styles.actionPrimaryBtn, expressingInterest && styles.actionBtnDisabled]}
              onPress={handleBuyIntent}
              disabled={expressingInterest}
            >
              {expressingInterest ? (
                <ActivityIndicator color={colors.textOnTile} size="small" />
              ) : (
                <Text style={styles.actionPrimaryBtnText}>我想買這件商品</Text>
              )}
            </TouchableOpacity>
          )}

          {(showProposeMeetupButton || showConfirmMeetupButton) && (
            <View style={styles.actionRow}>
              {showProposeMeetupButton && (
                <TouchableOpacity
                  style={[styles.actionOutlineBtn, styles.actionRowBtn]}
                  onPress={() => setShowMeetupModal(true)}
                >
                  <Text style={styles.actionOutlineBtnText}>提議交收</Text>
                </TouchableOpacity>
              )}
              {showConfirmMeetupButton && (
                <TouchableOpacity
                  style={[styles.actionOutlineBtn, styles.actionRowBtn, confirmingMeetup && styles.actionBtnDisabled]}
                  onPress={handleConfirmMeetup}
                  disabled={confirmingMeetup}
                >
                  {confirmingMeetup ? (
                    <ActivityIndicator color={colors.text} size="small" />
                  ) : (
                    <Text style={styles.actionOutlineBtnText}>確認交收</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}

          {showConfirmSaleButton && (
            <TouchableOpacity
              style={[styles.actionPrimaryBtn, confirmingSale && styles.actionBtnDisabled]}
              onPress={handleConfirmSale}
              disabled={confirmingSale}
            >
              {confirmingSale ? (
                <ActivityIndicator color={colors.textOnTile} size="small" />
              ) : (
                <Text style={styles.actionPrimaryBtnText}>確認售予此買家</Text>
              )}
            </TouchableOpacity>
          )}

          {showRateButton && (
            <TouchableOpacity
              style={styles.actionOutlineBtn}
              onPress={() =>
                router.push({
                  pathname: '/rate',
                  params: {
                    listingId: conversation.listingId,
                    listingTitle: conversation.listingTitle,
                    revieweeId: rateRevieweeId,
                    revieweeName: rateRevieweeName,
                  },
                })
              }
            >
              <Text style={styles.actionOutlineBtnText}>{rateButtonLabel}</Text>
            </TouchableOpacity>
          )}

          {isSold && hasRated && (
            <Text style={styles.actionHintText}>你已為這次交易評分</Text>
          )}
        </View>
      )}

      <ScrollView
        ref={scrollViewRef}
        style={styles.chatArea}
        contentContainerStyle={styles.chatContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {visibleMessages.length === 0 ? (
          <View style={styles.emptyChat}>
            <Text style={styles.emptyChatText}>開始跟 {otherPartyName} 聊聊這件商品吧</Text>
            {isBuyer && showBuyButton && (
              <Text style={styles.emptyChatHint}>確定想買？可使用上方「我想買這件商品」</Text>
            )}
          </View>
        ) : (
          visibleMessages.map((msg) => {
            if (msg.type === 'buy_intent' || msg.type === 'system') {
              return (
                <View key={msg.id} style={styles.systemLineWrap}>
                  <Text style={styles.systemLineText}>{msg.text}</Text>
                  <Text style={styles.systemLineTime}>{formatMessageTime(msg.createdAt)}</Text>
                </View>
              );
            }

            const isMe = msg.senderId === userId;
            return (
              <View
                key={msg.id}
                style={[styles.messageWrapper, isMe ? styles.messageWrapperMe : styles.messageWrapperSeller]}
              >
                {!isMe && (
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{otherPartyName.charAt(0).toUpperCase()}</Text>
                  </View>
                )}

                <View style={[styles.messageBubble, isMe ? styles.messageBubbleMe : styles.messageBubbleSeller]}>
                  <Text style={[styles.messageText, isMe ? styles.messageTextMe : styles.messageTextSeller]}>
                    {msg.text}
                  </Text>
                  <Text style={[styles.messageTime, isMe ? styles.messageTimeMe : styles.messageTimeSeller]}>
                    {formatMessageTime(msg.createdAt)}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {!isBlocked && (
        <View style={styles.quickReplySection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickReplyRow}
          >
            {quickReplies.map((reply) => (
              <TouchableOpacity
                key={reply.label}
                style={styles.quickReplyChip}
                onPress={() => handleQuickReply(reply.text)}
              >
                <Text style={styles.quickReplyChipText}>{reply.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {!isBlocked ? (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="輸入訊息..."
            value={inputText}
            onChangeText={setInputText}
            multiline
            editable={!sending}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || sending) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
          >
            <Text style={[styles.sendButtonText, (!inputText.trim() || sending) && styles.sendButtonTextDisabled]}>
              {sending ? '...' : '傳送'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <Modal visible={showMeetupModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>提議交收</Text>
            <Text style={styles.modalSub}>選好時間與地點，對方確認後即可安排面交。</Text>
            <Text style={styles.modalPolicy}>{TRADE_POLICY_SHORT}</Text>

            <Text style={styles.modalLabel}>時間</Text>
            <View style={styles.modalChipRow}>
              {MEETUP_TIME_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.modalChip,
                    meetupTime === option && !meetupTimeCustom.trim() && styles.modalChipActive,
                  ]}
                  onPress={() => {
                    setMeetupTime(option);
                    setMeetupTimeCustom('');
                  }}
                >
                  <Text
                    style={[
                      styles.modalChipText,
                      meetupTime === option && !meetupTimeCustom.trim() && styles.modalChipTextActive,
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.modalInput}
              placeholder="或自訂時間（例如：週六下午 3 點）"
              value={meetupTimeCustom}
              onChangeText={setMeetupTimeCustom}
            />

            <Text style={styles.modalLabel}>地點</Text>
            <View style={styles.modalChipRow}>
              {MEETUP_PLACE_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.modalChip,
                    meetupPlace === option && !meetupPlaceCustom.trim() && styles.modalChipActive,
                  ]}
                  onPress={() => {
                    setMeetupPlace(option);
                    setMeetupPlaceCustom('');
                  }}
                >
                  <Text
                    style={[
                      styles.modalChipText,
                      meetupPlace === option && !meetupPlaceCustom.trim() && styles.modalChipTextActive,
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.modalInput}
              placeholder="或自訂地點（例如：旺角 MOKO 正門）"
              value={meetupPlaceCustom}
              onChangeText={setMeetupPlaceCustom}
            />

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowMeetupModal(false)}
                disabled={proposingMeetup}
              >
                <Text style={styles.modalCancelBtnText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, proposingMeetup && styles.modalSubmitBtnDisabled]}
                onPress={handleProposeMeetup}
                disabled={proposingMeetup}
              >
                {proposingMeetup ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>送出提議</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 30 },
  loadingText: { marginTop: 12, fontSize: 16, color: colors.textMuted },
  errorTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 20 },
  backBtn: { backgroundColor: colors.tile, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  backBtnText: { color: colors.textOnTile, fontWeight: 'bold', fontSize: 16 },

  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemImage: { width: 48, height: 48, borderRadius: 10, marginRight: 12, backgroundColor: colors.mutedFill },
  itemInfo: { flex: 1 },
  itemTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  itemPrice: { fontSize: 13, color: colors.textSecondary, fontWeight: '600', marginTop: 2 },
  dealStatusText: { fontSize: 12, color: colors.textMuted, marginTop: 6, lineHeight: 17 },
  meetupStatusInline: { fontSize: 12, color: colors.textSecondary, marginTop: 2, lineHeight: 17 },
  sellerProfileLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.mutedFill,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sellerProfileLinkText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },

  actionPanel: {
    backgroundColor: colors.paper,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionRowBtn: { flex: 1 },
  actionPrimaryBtn: {
    backgroundColor: colors.tile,
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionPrimaryBtnText: { color: colors.textOnTile, fontSize: 14, fontWeight: '600' },
  actionOutlineBtn: {
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.paper,
  },
  actionOutlineBtnText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  actionBtnDisabled: { opacity: 0.6 },
  actionHintText: { fontSize: 12, color: colors.textMuted, textAlign: 'center', paddingVertical: 4 },

  blockedBanner: {
    backgroundColor: colors.mutedFill,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  blockedBannerText: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },

  chatArea: { flex: 1, backgroundColor: colors.background },
  chatContent: { padding: 16, paddingBottom: 20, flexGrow: 1 },
  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 48, paddingHorizontal: 24 },
  emptyChatText: { color: colors.textMuted, fontSize: 15, textAlign: 'center' },
  emptyChatHint: { color: colors.textSecondary, fontSize: 13, marginTop: 10, textAlign: 'center' },

  systemLineWrap: { alignItems: 'center', marginBottom: 14, paddingHorizontal: 12 },
  systemLineText: { fontSize: 12, color: colors.textMuted, textAlign: 'center', lineHeight: 18 },
  systemLineTime: { fontSize: 10, color: colors.textMuted, marginTop: 4, opacity: 0.85 },

  messageWrapper: { flexDirection: 'row', marginBottom: 15, maxWidth: '85%' },
  messageWrapperMe: { alignSelf: 'flex-end', justifyContent: 'flex-end' },
  messageWrapperSeller: { alignSelf: 'flex-start' },

  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.mutedFill,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    alignSelf: 'flex-end',
  },
  avatarText: { color: colors.textSecondary, fontWeight: 'bold', fontSize: 14 },

  messageBubble: { padding: 12, borderRadius: 16 },
  messageBubbleMe: { backgroundColor: colors.tile, borderBottomRightRadius: 4 },
  messageBubbleSeller: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },

  messageText: { fontSize: 15, lineHeight: 22 },
  messageTextMe: { color: colors.textOnTile },
  messageTextSeller: { color: colors.text },

  messageTime: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  messageTimeMe: { color: 'rgba(255,255,255,0.7)' },
  messageTimeSeller: { color: '#9CA3AF' },

  quickReplySection: {
    backgroundColor: colors.paper,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    paddingBottom: 4,
  },
  quickReplyRow: {
    paddingHorizontal: 12,
    gap: 8,
  },
  quickReplyChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: colors.mutedFill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickReplyChipText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.paper,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: colors.mutedFill,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 15,
    minHeight: 45,
    maxHeight: 100,
    color: colors.text,
  },
  sendButton: { marginLeft: 12, backgroundColor: colors.tile, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  sendButtonDisabled: { backgroundColor: colors.mutedFill },
  sendButtonText: { color: colors.textOnTile, fontWeight: 'bold', fontSize: 14 },
  sendButtonTextDisabled: { color: colors.textMuted },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#111111', marginBottom: 6 },
  modalSub: { fontSize: 13, color: '#6B7280', marginBottom: 8, lineHeight: 20 },
  modalPolicy: { fontSize: 12, color: colors.textMuted, marginBottom: 20, lineHeight: 18 },
  modalLabel: { fontSize: 14, fontWeight: 'bold', color: '#374151', marginBottom: 10 },
  modalChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  modalChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modalChipActive: { backgroundColor: '#DBEAFE', borderColor: '#93C5FD' },
  modalChipText: { fontSize: 13, color: '#4B5563', fontWeight: '600' },
  modalChipTextActive: { color: '#1D4ED8' },
  modalInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    marginBottom: 16,
  },
  modalFooter: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  modalCancelBtnText: { color: '#4B5563', fontWeight: 'bold', fontSize: 15 },
  modalSubmitBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 24,
    backgroundColor: '#1D4ED8',
    alignItems: 'center',
  },
  modalSubmitBtnDisabled: { opacity: 0.7 },
  modalSubmitBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
});
