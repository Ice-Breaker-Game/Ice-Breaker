
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";

const questions = [
  {
    question: "What is a good way to break the ice?",
    answers: [
      "Ask a fun question",
      "Ignore everyone",
      "Leave the room",
    ],
    correctAnswer: 0,
  },
  {
    question: "Which activity helps people get to know each other?",
    answers: [
      "Staying silent",
      "Two truths and a lie",
      "Looking at your phone",
    ],
    correctAnswer: 1,
  },
  {
    question: "What makes a good icebreaker?",
    answers: [
      "Making people uncomfortable",
      "Having no instructions",
      "Being fun and inclusive",
    ],
    correctAnswer: 2,
  },
];

type ScoreRecord = {
  score: number;
  totalQuestions: number;
  completedAt: string;
};
type Minigame = "question-challenge" | "icebreaker-prompt";

const icebreakerPrompts = [
  "What is one new skill you would like to learn?",
  "What is your favorite way to spend a weekend?",
  "If you could visit anywhere, where would you go?",
  "What is something that always makes you smile?",
];

export default function Index() {
  const { user } = useAuth();
  const [matchStarted, setMatchStarted] = useState(false);
  const [selectedMinigame, setSelectedMinigame] =
    useState<Minigame>("question-challenge");
  const [promptIndex, setPromptIndex] = useState(0);

  const storageKey = `question-challenge-scores-${
    user?.uid ?? user?.email ?? "guest"
  }`;

  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [scoreHistory, setScoreHistory] = useState<ScoreRecord[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [savingScore, setSavingScore] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadScores() {
      try {
        const savedScores = await AsyncStorage.getItem(storageKey);

        if (savedScores !== null && active) {
          const parsedScores: unknown = JSON.parse(savedScores);

          if (Array.isArray(parsedScores)) {
            setScoreHistory(parsedScores as ScoreRecord[]);
          }
        }
      } catch {
        if (active) {
          setSaveMessage("Could not load previous scores.");
        }
      } finally {
        if (active) {
          setHistoryLoaded(true);
        }
      }
    }

    void loadScores();

    return () => {
      active = false;
    };
  }, [storageKey]);

  const currentQuestion = questions[questionIndex];

  function chooseAnswer(answerIndex: number) {
    if (selectedAnswer !== null || finished) {
      return;
    }

    setSelectedAnswer(answerIndex);

    if (answerIndex === currentQuestion.correctAnswer) {
      setScore((previousScore) => previousScore + 1);
    }
  }

  async function finishGame() {
    const record: ScoreRecord = {
      score,
      totalQuestions: questions.length,
      completedAt: new Date().toISOString(),
    };

    setFinished(true);
    setSavingScore(true);
    setSaveMessage("");

    try {
      const updatedHistory = [record, ...scoreHistory];

      await AsyncStorage.setItem(
        storageKey,
        JSON.stringify(updatedHistory)
      );

      setScoreHistory(updatedHistory);
      setSaveMessage("Score saved successfully on this device!");
    } catch {
      setSaveMessage(
        "Your game is complete, but the score could not be saved. Please try again."
      );
    } finally {
      setSavingScore(false);
    }
  }

  async function nextQuestion() {
    if (selectedAnswer === null || savingScore) {
      return;
    }

    if (questionIndex === questions.length - 1) {
      await finishGame();
      return;
    }

    setQuestionIndex((previousIndex) => previousIndex + 1);
    setSelectedAnswer(null);
  }
function startMatch() {
  const minigames: Minigame[] = [
    "question-challenge",
    "icebreaker-prompt",
  ];

  const randomIndex = Math.floor(Math.random() * minigames.length);
  const chosenMinigame = minigames[randomIndex];

  setSelectedMinigame(chosenMinigame);
  setMatchStarted(true);

  if (chosenMinigame === "question-challenge") {
    setQuestionIndex(0);
    setScore(0);
    setSelectedAnswer(null);
    setFinished(false);
    setSaveMessage("");
  } else {
    const randomPromptIndex = Math.floor(
      Math.random() * icebreakerPrompts.length
    );
    setPromptIndex(randomPromptIndex);
  }
}
  function restartGame() {
  setQuestionIndex(0);
  setScore(0);
  setSelectedAnswer(null);
  setFinished(false);
  setSaveMessage("");
  setMatchStarted(false);
}

  if (!historyLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0e7490" />
        <Text style={styles.feedback}>Loading your saved scores...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Ice Breaker</Text>
      <Text style={styles.subtitle}>
  {!matchStarted
    ? "Random Minigame Selection"
    : selectedMinigame === "icebreaker-prompt"
      ? "Icebreaker Prompt"
      : "Question Challenge"}
</Text>

      <Text style={styles.userText}>
        Logged in as {user?.email ?? "Student"}
      </Text>

     {!matchStarted ? (
  <View style={styles.card}>
    <Text style={styles.question}>Ready to play?</Text>
    <Text style={styles.feedback}>
      Start a match and let the app choose your minigame.
    </Text>

    <Pressable style={styles.button} onPress={startMatch}>
      <Text style={styles.buttonText}>Start Match</Text>
    </Pressable>
  </View>
) : selectedMinigame === "icebreaker-prompt" ? (
  <View style={styles.card}>
    <Text style={styles.question}>Icebreaker Prompt</Text>
    <Text style={styles.feedback}>
      Take turns answering this question!
    </Text>
    <Text style={styles.question}>
      {icebreakerPrompts[promptIndex]}
    </Text>

    <Pressable
      style={styles.button}
      onPress={() =>
        setPromptIndex(
          (previousIndex) =>
            (previousIndex + 1) % icebreakerPrompts.length
        )
      }
    >
      <Text style={styles.buttonText}>Next Prompt</Text>
    </Pressable>

    <Pressable
      style={styles.button}
      onPress={() => setMatchStarted(false)}
    >
      <Text style={styles.buttonText}>Back to Match Menu</Text>
    </Pressable>
  </View>
) : finished ? (
        <View style={styles.card}>
          <Text style={styles.question}>Game complete!</Text>

          <Text style={styles.score}>
            Your score: {score} / {questions.length}
          </Text>

          <Text style={styles.feedback}>
            {score === questions.length
              ? "Perfect score! Great job!"
              : "Nice effort! Play again to improve your score."}
          </Text>

          {savingScore && (
            <View style={styles.savingRow}>
              <ActivityIndicator color="#0e7490" />
              <Text style={styles.feedback}>Saving your score...</Text>
            </View>
          )}

          {!!saveMessage && (
            <Text
              style={
                saveMessage.startsWith("Score saved")
                  ? styles.successMessage
                  : styles.errorMessage
              }
            >
              {saveMessage}
            </Text>
          )}

          <Pressable
            style={[
              styles.button,
              savingScore ? styles.disabledButton : null,
            ]}
            onPress={restartGame}
            disabled={savingScore}
          >
            <Text style={styles.buttonText}>Play Again</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.progress}>
            Question {questionIndex + 1} of {questions.length}
          </Text>

          <Text style={styles.question}>
            {currentQuestion.question}
          </Text>

          {currentQuestion.answers.map((answer, index) => {
            const isCorrect =
              index === currentQuestion.correctAnswer;
            const isSelected = index === selectedAnswer;

            return (
              <Pressable
                key={answer}
                style={[
                  styles.answer,
                  selectedAnswer !== null && isCorrect
                    ? styles.correctAnswer
                    : null,
                  isSelected && !isCorrect
                    ? styles.wrongAnswer
                    : null,
                ]}
                onPress={() => chooseAnswer(index)}
                disabled={selectedAnswer !== null}
              >
                <Text style={styles.answerText}>{answer}</Text>
              </Pressable>
            );
          })}

          {selectedAnswer !== null && (
            <>
              <Text style={styles.feedback}>
                {selectedAnswer === currentQuestion.correctAnswer
                  ? "Correct! Well done."
                  : "Not quite! The correct answer is highlighted."}
              </Text>

              <Pressable
                style={[
                  styles.button,
                  savingScore ? styles.disabledButton : null,
                ]}
                onPress={() => void nextQuestion()}
                disabled={savingScore}
              >
                <Text style={styles.buttonText}>
                  {questionIndex === questions.length - 1
                    ? "Finish Game"
                    : "Next Question"}
                </Text>
              </Pressable>
            </>
          )}

          <Text style={styles.score}>
            Score: {score} / {questions.length}
          </Text>
        </View>
      )}

      <View style={styles.historyCard}>
        <Text style={styles.historyTitle}>Saved Score History</Text>

        {scoreHistory.length === 0 ? (
          <Text style={styles.feedback}>
            Complete your first game to record a score.
          </Text>
        ) : (
          scoreHistory.slice(0, 5).map((record, index) => (
            <View
              key={`${record.completedAt}-${index}`}
              style={styles.historyRow}
            >
              <Text style={styles.historyScore}>
                {record.score} / {record.totalQuestions}
              </Text>

              <Text style={styles.historyDate}>
                {new Date(record.completedAt).toLocaleString()}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#f0f7fa",
    alignItems: "center",
    padding: 20,
    paddingTop: 40,
    gap: 14,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#f0f7fa",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#155e75",
  },
  subtitle: {
    fontSize: 20,
    color: "#334155",
  },
  userText: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 8,
  },
  card: {
    width: "100%",
    maxWidth: 480,
    backgroundColor: "#ffffff",
    padding: 22,
    borderRadius: 16,
    gap: 14,
  },
  progress: {
    fontSize: 14,
    color: "#64748b",
  },
  question: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#0f172a",
  },
  answer: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
  },
  correctAnswer: {
    backgroundColor: "#dcfce7",
    borderColor: "#16a34a",
  },
  wrongAnswer: {
    backgroundColor: "#fee2e2",
    borderColor: "#dc2626",
  },
  answerText: {
    fontSize: 16,
    color: "#1e293b",
  },
  feedback: {
    fontSize: 15,
    color: "#334155",
  },
  score: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#155e75",
  },
  button: {
    backgroundColor: "#0e7490",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
  savingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  successMessage: {
    fontSize: 14,
    color: "#166534",
  },
  errorMessage: {
    fontSize: 14,
    color: "#b91c1c",
  },
  historyCard: {
    width: "100%",
    maxWidth: 480,
    backgroundColor: "#ffffff",
    padding: 18,
    borderRadius: 16,
    gap: 12,
    marginBottom: 20,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#155e75",
  },
  historyRow: {
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 10,
    gap: 4,
  },
  historyScore: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0f172a",
  },
  historyDate: {
    fontSize: 12,
    color: "#64748b",
  },
});
