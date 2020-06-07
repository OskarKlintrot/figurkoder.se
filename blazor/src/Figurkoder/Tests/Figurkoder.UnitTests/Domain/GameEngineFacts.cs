using Figurkoder.Domain;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Threading;
using Xunit;

namespace Figurkoder.UnitTests.Domain
{
    public class GameEngineFacts
    {
        [Fact]
        public void Start_GameStarts_CurrentEventTriggers()
        {
            // Arrange
            var gameEngine = new GameEngine();
            var currentReceived = new AutoResetEvent(false);
            gameEngine.Current += CurrentHandler;

            void CurrentHandler(object? _, EventArgs e)
            {
                currentReceived.Set();
            }

            // Act
            gameEngine.Start(new Game(TimeSpan.FromMilliseconds(100), new [] { KeyValuePair.Create("Foo", "Bar") }));

            // Assert
            Assert.True(currentReceived.WaitOne(TimeSpan.FromMilliseconds(10)));
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
            gameEngine.Start(new Game(TimeSpan.FromMilliseconds(50), new[] { KeyValuePair.Create("Foo", "Bar") }));

            // Assert
            Assert.True(finishedReceived.WaitOne(TimeSpan.FromMilliseconds(75)));
        }

        [Fact]
        public void Start_TimesUp_CurrentEventTriggers()
        {
            // Arrange
            var currentCounter = 0;
            var gameEngine = new GameEngine();
            var sw = new Stopwatch();
            var currentReceived = new AutoResetEvent(false);
            gameEngine.GameStart += GameStartHandler;
            gameEngine.Current += CurrentHandler;

            void GameStartHandler(object? _, EventArgs e)
            {
                sw.Start();
            }
            void CurrentHandler(object? _, EventArgs e)
            {
                currentCounter++;

                if (currentCounter == 2)
                {
                    sw.Stop();
                    currentReceived.Set();
                }
            }

            // Act
            gameEngine.Start(new Game(TimeSpan.FromMilliseconds(100), new[] { KeyValuePair.Create("Foo", "Bar"), KeyValuePair.Create("Foo", "Bar") }));

            // Assert
            currentReceived.WaitOne(TimeSpan.FromMilliseconds(115));
            Assert.InRange(sw.Elapsed, TimeSpan.FromMilliseconds(80), TimeSpan.FromMilliseconds(120)); // Allow �20ms
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
        public void Start_TwoFlashCard_CurrentEventTriggersTwoTimes(int _)
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
            gameEngine.Start(new Game(TimeSpan.FromMilliseconds(10), new[] {
                KeyValuePair.Create("FirstKey", "FirstValue"),
                KeyValuePair.Create("SecondKey", "SecondValue") }));

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
    }
}
