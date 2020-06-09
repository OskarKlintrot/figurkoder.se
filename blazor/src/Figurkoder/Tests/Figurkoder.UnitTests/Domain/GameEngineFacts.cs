using Figurkoder.Domain;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Xunit;

namespace Figurkoder.UnitTests.Domain
{
    public class GameEngineFacts
    {
        [Fact]
        public void Start_NoFlashcardsProvided_ThrowArgumentException()
        {
            // Arrange
            var gameEngine = new GameEngine();

            // Act
            var exception = Record.Exception(()
                => gameEngine.Start(new Game(TimeSpan.FromMilliseconds(100), Array.Empty<KeyValuePair<string, string>>(), false)));

            // Assert
            Assert.IsType<ArgumentException>(exception);
            Assert.Equal("Missing flashcards! (Parameter 'game')", exception.Message);
        }

        [Fact]
        public void Start_GameStarts_GameStartEventTriggers()
        {
            // Arrange
            var gameEngine = new GameEngine();
            var startReceived = new AutoResetEvent(false);
            gameEngine.GameStart += GameStartHandler;

            void GameStartHandler(object? _, EventArgs e)
            {
                startReceived.Set();
            }

            // Act
            gameEngine.Start(new Game(TimeSpan.FromMilliseconds(100), new[] { KeyValuePair.Create("Foo", "Bar") }, false));

            // Assert
            Assert.True(startReceived.WaitOne(TimeSpan.FromMilliseconds(10)));
        }

        [Fact]
        public void Start_GameStarts_CurrentEventTriggers()
        {
            // Arrange
            var gameEngine = new GameEngine();
            var currentReceived = new AutoResetEvent(false);
            CurrentEventArgs? currentEventArgs = null;
            gameEngine.Current += CurrentHandler;

            void CurrentHandler(object? _, CurrentEventArgs e)
            {
                currentEventArgs = e;
                currentReceived.Set();
            }

            // Act
            gameEngine.Start(new Game(TimeSpan.FromMilliseconds(100), new[] { KeyValuePair.Create("Foo", "Bar") }, false));

            // Assert
            Assert.True(currentReceived.WaitOne(TimeSpan.FromMilliseconds(10))); // 10 ms to make sure the enginge never have a chance to trigger Current based on timer elapsed
            Assert.Equal(1, currentEventArgs?.Count);
            Assert.Equal("Foo", currentEventArgs?.Current.Key);
            Assert.Equal("Bar", currentEventArgs?.Current.Value);
        }

        [Fact]
        public void Start_GameEnds_GameFinishedEventTriggers()
        {
            // Arrange
            var gameEngine = new GameEngine();
            var finishedReceived = new AutoResetEvent(false);
            gameEngine.GameFinished += GameFinishedHandler;

            void GameFinishedHandler(object? _, EventArgs e)
            {
                finishedReceived.Set();
            }

            // Act
            gameEngine.Start(new Game(TimeSpan.FromMilliseconds(50), new[] { KeyValuePair.Create("Foo", "Bar") }, false));

            // Assert
            Assert.True(finishedReceived.WaitOne(TimeSpan.FromMilliseconds(75)));
        }

        [Fact]
        public void Start_GameEnds_Result()
        {
            // Arrange
            var gameEngine = new GameEngine();
            var finishedReceived = new AutoResetEvent(false);
            gameEngine.GameFinished += GameFinishedHandler;
            GameFinishedEventArgs? gameFinishedEventArgs = null;

            void GameFinishedHandler(object? _, GameFinishedEventArgs e)
            {
                gameFinishedEventArgs = e;
                finishedReceived.Set();
            }

            // Act
            gameEngine.Start(new Game(
                TimeSpan.FromMilliseconds(10),
                new[]
                {
                    KeyValuePair.Create("Foo", "Bar"),
                    KeyValuePair.Create("Bar", "Foo")
                },
                false));

            // Assert
            Assert.True(finishedReceived.WaitOne(TimeSpan.FromMilliseconds(50)));
            Assert.Equal(2, gameFinishedEventArgs?.Result.Length);

            Assert.Equal("Foo", gameFinishedEventArgs?.Result[0].Flashcard.Key);
            Assert.Equal("Bar", gameFinishedEventArgs?.Result[0].Flashcard.Value);
            Assert.Equal(TimeSpan.FromMilliseconds(10), gameFinishedEventArgs?.Result[0].Time);

            Assert.Equal("Bar", gameFinishedEventArgs?.Result[1].Flashcard.Key);
            Assert.Equal("Foo", gameFinishedEventArgs?.Result[1].Flashcard.Value);
            Assert.Equal(TimeSpan.FromMilliseconds(10), gameFinishedEventArgs?.Result[1].Time);

            Assert.Equal(TimeSpan.FromMilliseconds(10), gameFinishedEventArgs?.Average);
        }

        [Fact]
        public void Start_TimesUp_CurrentEventTriggers()
        {
            // Arrange
            var currentCounter = 0;
            var gameEngine = new GameEngine();
            var sw = new Stopwatch();
            var currentReceived = new AutoResetEvent(false);
            gameEngine.Current += CurrentHandler;

            void CurrentHandler(object? _, EventArgs e)
            {
                currentCounter++;

                if (currentCounter == 1)
                {
                    sw.Start();
                }
                else if (currentCounter == 2)
                {
                    sw.Stop();
                    currentReceived.Set();
                }
                else
                {
                    throw new NotSupportedException($"Current should only be triggered 2 times, not {currentCounter}.");
                }
            }

            // Act
            gameEngine.Start(new Game(
                TimeSpan.FromMilliseconds(100),
                new[]
                {
                    KeyValuePair.Create("Foo", "Bar"),
                    KeyValuePair.Create("Foo", "Bar")
                },
                false));

            // Assert
            currentReceived.WaitOne(TimeSpan.FromMilliseconds(115));
            Assert.InRange(sw.Elapsed, TimeSpan.FromMilliseconds(80), TimeSpan.FromMilliseconds(120)); // Allow ±20ms
        }

        [Fact]
        public async Task Start_Next_CurrentEventTriggers()
        {
            // Arrange
            var currentCounter = 0;
            var gameEngine = new GameEngine();
            var sw = new Stopwatch();
            var currentReceived = new AutoResetEvent(false);
            gameEngine.Current += CurrentHandler;

            void CurrentHandler(object? _, EventArgs e)
            {
                currentCounter++;

                if (currentCounter == 1)
                {
                    sw.Start();
                }
                else if (currentCounter == 2)
                {
                    sw.Stop();
                    currentReceived.Set();
                }
                else
                {
                    throw new NotSupportedException($"Current should only be triggered 2 times, not {currentCounter}.");
                }
            }

            gameEngine.Start(new Game(
                TimeSpan.FromMilliseconds(1000),
                new[]
                {
                    KeyValuePair.Create("Foo", "Bar"),
                    KeyValuePair.Create("Foo", "Bar")
                },
                false));

            // Act
            await Task.Delay(100);
            gameEngine.Next();

            // Assert
            currentReceived.WaitOne(TimeSpan.FromMilliseconds(115));
            Assert.InRange(sw.Elapsed, TimeSpan.FromMilliseconds(80), TimeSpan.FromMilliseconds(120)); // Allow ±20ms
        }

        [Fact]
        public async Task Start_GameEndsByUsingNext_Result()
        {
            // Arrange
            var gameEngine = new GameEngine();
            var finishedReceived = new AutoResetEvent(false);
            gameEngine.GameFinished += GameFinishedHandler;
            GameFinishedEventArgs? gameFinishedEventArgs = null;

            void GameFinishedHandler(object? _, GameFinishedEventArgs e)
            {
                gameFinishedEventArgs = e;
                finishedReceived.Set();
            }

            gameEngine.Start(new Game(
                TimeSpan.FromMilliseconds(500),
                new[]
                {
                    KeyValuePair.Create("Foo", "Bar"),
                    KeyValuePair.Create("Bar", "Foo"),
                    KeyValuePair.Create("Fuu", "bar")
                },
                false));

            // Act
            await Task.Delay(200);
            gameEngine.Next();
            await Task.Delay(100);
            gameEngine.Next();

            // Assert
            Assert.True(finishedReceived.WaitOne(TimeSpan.FromMilliseconds(1000)));
            Assert.Equal(3, gameFinishedEventArgs?.Result.Length);

            Assert.Equal("Foo", gameFinishedEventArgs?.Result[0].Flashcard.Key);
            Assert.Equal("Bar", gameFinishedEventArgs?.Result[0].Flashcard.Value);
            Assert.InRange(gameFinishedEventArgs?.Result[0].Time ?? TimeSpan.Zero, TimeSpan.FromMilliseconds(180), TimeSpan.FromMilliseconds(220)); // Allow ±20ms

            Assert.Equal("Bar", gameFinishedEventArgs?.Result[1].Flashcard.Key);
            Assert.Equal("Foo", gameFinishedEventArgs?.Result[1].Flashcard.Value);
            Assert.InRange(gameFinishedEventArgs?.Result[1].Time ?? TimeSpan.Zero, TimeSpan.FromMilliseconds(80), TimeSpan.FromMilliseconds(120)); // Allow ±20ms

            Assert.Equal("Fuu", gameFinishedEventArgs?.Result[2].Flashcard.Key);
            Assert.Equal("bar", gameFinishedEventArgs?.Result[2].Flashcard.Value);
            Assert.Equal(TimeSpan.FromMilliseconds(500), gameFinishedEventArgs?.Result[2].Time);

            Assert.InRange(gameFinishedEventArgs?.Average ?? TimeSpan.Zero, TimeSpan.FromMilliseconds(240), TimeSpan.FromMilliseconds(280)); // Allow ±20ms
        }

        [Theory]
        [InlineData(0)]
        [InlineData(1)]
        [InlineData(2)]
        [InlineData(3)]
        [InlineData(4)]
        [InlineData(5)]
        [InlineData(6)]
        [InlineData(7)]
        [InlineData(8)]
        [InlineData(9)]
        [System.Diagnostics.CodeAnalysis.SuppressMessage("Usage", "xUnit1026:Theory methods should use all of their parameters", Justification = "Run test 10 times to make sure order is respected")]
        public void Start_TwoFlashcard_CurrentEventTriggersTwoTimes(int _)
        {
            // Arrange
            var gameEngine = new GameEngine();
            CurrentEventArgs? currentEventArgs = null;
            var currentReceived = new AutoResetEvent(false);
            gameEngine.Current += CurrentHandler;

            void CurrentHandler(object? _, CurrentEventArgs e)
            {
                currentEventArgs = e;
                currentReceived.Set();
            }

            // Act
            gameEngine.Start(new Game(
                TimeSpan.FromMilliseconds(10),
                new[]
                {
                    KeyValuePair.Create("FirstKey", "FirstValue"),
                    KeyValuePair.Create("SecondKey", "SecondValue")
                },
                false));

            // Assert
            Assert.True(currentReceived.WaitOne(TimeSpan.FromMilliseconds(30)));
            Assert.Equal(1, currentEventArgs?.Count);
            Assert.Equal("FirstKey", currentEventArgs?.Current.Key);
            Assert.Equal("FirstValue", currentEventArgs?.Current.Value);

            Assert.True(currentReceived.WaitOne(TimeSpan.FromMilliseconds(30)));
            Assert.Equal(2, currentEventArgs?.Count);
            Assert.Equal("SecondKey", currentEventArgs?.Current.Key);
            Assert.Equal("SecondValue", currentEventArgs?.Current.Value);
        }

        [Theory]
        [InlineData(true)]
        [InlineData(false)]
        public void Start_Randomize_RandomizeOrder(bool randomize)
        {
            // Arrange
            var flashcards = new[]
            {
                KeyValuePair.Create("FirstKey", "FirstValue"),
                KeyValuePair.Create("SecondKey", "SecondValue"),
                KeyValuePair.Create("ThirdKey", "ThirdValue"),
                KeyValuePair.Create("FourthKey", "FourthValue")
            };

            var showedFlashcards = new List<KeyValuePair<string, string>>(flashcards.Length);

            var gameEngine = new GameEngine();
            var endReceived = new AutoResetEvent(false);
            gameEngine.Current += CurrentHandler;
            gameEngine.GameFinished += GameFinishedHandler;

            void CurrentHandler(object? _, CurrentEventArgs e)
            {
                showedFlashcards.Add(e.Current);
            }

            void GameFinishedHandler(object? _, GameFinishedEventArgs e)
            {
                endReceived.Set();
            }

            // Act
            gameEngine.Start(new Game(
                TimeSpan.FromMilliseconds(10),
                flashcards,
                randomize));

            // Assert
            Assert.True(endReceived.WaitOne(TimeSpan.FromMilliseconds(80)));
            Assert.Equal(flashcards.Length, showedFlashcards.Count);
            Assert.NotEqual(randomize, flashcards.SequenceEqual(showedFlashcards));
        }

        [Theory]
        [InlineData(true)]
        [InlineData(false)]
        public void Start_Randomize_DoNotRandomizeResult(bool randomize)
        {
            // Arrange
            var gameEngine = new GameEngine();
            GameFinishedEventArgs? gameFinishedEventArgs = null;
            var endReceived = new AutoResetEvent(false);
            gameEngine.GameFinished += GameFinishedHandler;

            void GameFinishedHandler(object? _, GameFinishedEventArgs e)
            {
                gameFinishedEventArgs = e;
                endReceived.Set();
            }

            var flashcards = new[]
            {
                KeyValuePair.Create("FirstKey", "FirstValue"),
                KeyValuePair.Create("SecondKey", "SecondValue"),
                KeyValuePair.Create("ThirdKey", "ThirdValue"),
                KeyValuePair.Create("FourthKey", "FourthValue")
            };

            // Act
            gameEngine.Start(new Game(
                TimeSpan.FromMilliseconds(10),
                flashcards,
                randomize));

            // Assert
            Assert.True(endReceived.WaitOne(TimeSpan.FromMilliseconds(80)));
            Assert.Equal(TimeSpan.FromMilliseconds(10), gameFinishedEventArgs?.Average);
            Assert.True(flashcards.SequenceEqual(gameFinishedEventArgs?.Result.Select(x => x.Flashcard)));
        }
    }
}
